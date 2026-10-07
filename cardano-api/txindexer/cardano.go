package txindexer

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer/gouroboros"
	"github.com/hashicorp/go-hclog"
)

const (
	cardanoSyncerRestartDelay = 5 * time.Second
	cardanoSyncerKeepAlive    = true
	cardanoSyncStartTries     = 4
)

var errNoBridgingAddresses = errors.New("bridging addresses are not known yet")

type cardanoBlockPoint struct {
	Slot uint64       `json:"slot"`
	Hash indexer.Hash `json:"hash"`
}

type cardanoPointsDB interface {
	GetCardanoBlockPoints(chainID string) ([]cardanoBlockPoint, error)
	SetCardanoBlockPoints(chainID string, points []cardanoBlockPoint) error
}

// BridgingAddressesProvider returns the current bridging addresses of a cardano chain
type BridgingAddressesProvider func(ctx context.Context, chainID string) ([]string, error)

// TokenIDResolver resolves token ID for metadata written before token IDs were introduced
type TokenIDResolver func(chainID string, isNativeTokenOnSrc bool) uint16

// cardanoBlockHandler processes every block as soon as it is received (no confirmations).
//
// The indexer from cardano-infrastructure is not used on purpose: it requires at least one
// confirmation and treats a rollback of an already processed block as fatal. Here a rollback is
// harmless - txs from the abandoned fork are either included again (and seen again) or never
// reach the oracle and expire by their TTL on web-api.
type cardanoBlockHandler struct {
	config    *core.CardanoIndexerConfig
	pointsDB  cardanoPointsDB
	txsStore  BridgingTxsStore
	resolveID TokenIDResolver
	logger    hclog.Logger

	addressesLock sync.RWMutex
	addresses     map[string]struct{}

	// recently processed blocks ordered by slot, used for resuming and for skipping known blocks
	points []cardanoBlockPoint
	// number of Reset calls since the last processed block, used to move the resume point back
	// when the node does not recognize the previous one
	resetAttempts int
}

var _ indexer.BlockSyncerHandler = (*cardanoBlockHandler)(nil)

func newCardanoBlockHandler(
	config *core.CardanoIndexerConfig, pointsDB cardanoPointsDB, txsStore BridgingTxsStore,
	resolveID TokenIDResolver, logger hclog.Logger,
) (*cardanoBlockHandler, error) {
	points, err := pointsDB.GetCardanoBlockPoints(config.ChainID)
	if err != nil {
		return nil, fmt.Errorf("could not load block points for %s: %w", config.ChainID, err)
	}

	return &cardanoBlockHandler{
		config:    config,
		pointsDB:  pointsDB,
		txsStore:  txsStore,
		resolveID: resolveID,
		logger:    logger,
		points:    points,
	}, nil
}

func (h *cardanoBlockHandler) setAddresses(addresses []string) {
	addressesMap := make(map[string]struct{}, len(addresses))

	for _, addr := range addresses {
		if addr = strings.TrimSpace(addr); addr != "" {
			addressesMap[addr] = struct{}{}
		}
	}

	h.addressesLock.Lock()
	h.addresses = addressesMap
	h.addressesLock.Unlock()
}

func (h *cardanoBlockHandler) getAddresses() map[string]struct{} {
	h.addressesLock.RLock()
	defer h.addressesLock.RUnlock()

	return h.addresses
}

// Reset is called by the syncer on every (re)connect and returns the point to sync from
func (h *cardanoBlockHandler) Reset() (indexer.BlockPoint, error) {
	attempt := h.resetAttempts
	h.resetAttempts++

	depth := h.config.ResumeBlockDepth

	// try a point resumeBlockDepth blocks behind the last processed one first, then the oldest known
	// point and finally (on the last attempt of a sync start) the configured starting point.
	// Failed attempts are usually caused by connection problems, so the starting point is the last resort
	var point *cardanoBlockPoint

	switch {
	case len(h.points) == 0:
	case attempt < cardanoSyncStartTries-2:
		point = &h.points[max(len(h.points)-1-depth, 0)]
	case attempt < cardanoSyncStartTries-1:
		point = &h.points[0]
	}

	if point == nil {
		point = &cardanoBlockPoint{
			Slot: h.config.StartSlot,
			Hash: indexer.NewHashFromHexString(h.config.StartBlockHash),
		}
	}

	h.logger.Info("Syncing from block point", "chain", h.config.ChainID,
		"slot", point.Slot, "hash", point.Hash, "attempt", attempt)

	return indexer.BlockPoint{BlockSlot: point.Slot, BlockHash: point.Hash}, nil
}

func (h *cardanoBlockHandler) RollBackward(point indexer.BlockPoint) error {
	// known points after the rollback point are dropped when the blocks of the new fork arrive
	h.logger.Debug("Roll backward", "chain", h.config.ChainID, "slot", point.BlockSlot, "hash", point.BlockHash)

	return nil
}

func (h *cardanoBlockHandler) RollForward(
	blockHeader indexer.BlockHeader, txsRetriever indexer.BlockTxsRetriever,
) error {
	h.resetAttempts = 0

	if h.isKnownBlock(blockHeader) {
		return nil
	}

	addresses := h.getAddresses()
	if len(addresses) == 0 {
		return errNoBridgingAddresses
	}

	txs, err := txsRetriever.GetBlockTransactions(blockHeader)
	if err != nil {
		return fmt.Errorf("could not retrieve txs for block %d (%s): %w", blockHeader.Slot, blockHeader.Hash, err)
	}

	bridgingTxs := make([]*BridgingTx, 0)

	for _, tx := range txs {
		if bridgingTx := h.toBridgingTx(blockHeader, tx, addresses); bridgingTx != nil {
			bridgingTxs = append(bridgingTxs, bridgingTx)
		}
	}

	if err := h.txsStore.AddBridgingTxs(bridgingTxs); err != nil {
		return fmt.Errorf("could not save bridging txs: %w", err)
	}

	for _, tx := range bridgingTxs {
		h.logger.Info("New bridging tx", "chain", h.config.ChainID, "hash", tx.TxHash, "slot", blockHeader.Slot)
	}

	return h.addPoint(cardanoBlockPoint{Slot: blockHeader.Slot, Hash: blockHeader.Hash})
}

func (h *cardanoBlockHandler) isKnownBlock(blockHeader indexer.BlockHeader) bool {
	for i := len(h.points) - 1; i >= 0; i-- {
		if h.points[i].Hash == blockHeader.Hash {
			return true
		}
	}

	return false
}

func (h *cardanoBlockHandler) addPoint(point cardanoBlockPoint) error {
	// blocks at or after the new slot belong to an abandoned fork
	cnt := len(h.points)
	for cnt > 0 && h.points[cnt-1].Slot >= point.Slot {
		cnt--
	}

	points := make([]cardanoBlockPoint, cnt, cnt+1)
	copy(points, h.points[:cnt])
	points = append(points, point)

	if maxCnt := 2 * h.config.ResumeBlockDepth; len(points) > maxCnt {
		points = points[len(points)-maxCnt:]
	}

	if err := h.pointsDB.SetCardanoBlockPoints(h.config.ChainID, points); err != nil {
		return fmt.Errorf("could not save block points: %w", err)
	}

	h.points = points

	return nil
}

func (h *cardanoBlockHandler) toBridgingTx(
	blockHeader indexer.BlockHeader, tx *indexer.Tx, addresses map[string]struct{},
) *BridgingTx {
	var value uint64

	for _, out := range tx.Outputs {
		if _, exists := addresses[out.Address]; exists {
			value += out.Amount
		}
	}

	if value == 0 {
		return nil
	}

	metadata, err := parseBridgingRequestMetadata(tx.Metadata)
	if err != nil || metadata == nil {
		h.logger.Debug("Tx to bridging address is not a bridging request",
			"chain", h.config.ChainID, "hash", tx.Hash, "err", err)

		return nil
	}

	receivers := make([]BridgingTxReceiver, len(metadata.Transactions))

	for i, receiver := range metadata.Transactions {
		tokenID := receiver.TokenID
		if tokenID == 0 && h.resolveID != nil {
			tokenID = h.resolveID(h.config.ChainID, receiver.IsNativeTokenOnSrc_Obsolete != 0)
		}

		receivers[i] = BridgingTxReceiver{
			Address: strings.Join(receiver.Address, ""),
			Amount:  strconv.FormatUint(receiver.Amount, 10),
			TokenID: tokenID,
		}
	}

	return &BridgingTx{
		OriginChainID:      h.config.ChainID,
		TxHash:             tx.Hash.String(),
		DestinationChainID: metadata.DestinationChainID,
		SenderAddr:         strings.Join(metadata.SenderAddr, ""),
		Receivers:          receivers,
		BridgingFee:        strconv.FormatUint(metadata.BridgingFee, 10),
		OperationFee:       strconv.FormatUint(metadata.OperationFee, 10),
		Value:              strconv.FormatUint(value, 10),
		BlockNumber:        blockHeader.Slot,
		BlockHash:          blockHeader.Hash.String(),
		TTL:                blockHeader.Slot + h.config.TTLSlotNumberInc,
	}
}

type cardanoIndexer struct {
	config          *core.CardanoIndexerConfig
	networkMagic    uint32
	handler         *cardanoBlockHandler
	getAddresses    BridgingAddressesProvider
	logger          hclog.Logger
	syncerLogger    hclog.Logger
	closeCh         chan struct{}
	closeOnce       sync.Once
	syncerCloseLock sync.Mutex
	syncer          *gouroboros.BlockSyncerImpl
}

func newCardanoIndexer(
	config *core.CardanoIndexerConfig, networkMagic uint32, pointsDB cardanoPointsDB, txsStore BridgingTxsStore,
	getAddresses BridgingAddressesProvider, resolveID TokenIDResolver, logger, syncerLogger hclog.Logger,
) (*cardanoIndexer, error) {
	handler, err := newCardanoBlockHandler(config, pointsDB, txsStore, resolveID, logger)
	if err != nil {
		return nil, err
	}

	return &cardanoIndexer{
		config:       config,
		networkMagic: networkMagic,
		handler:      handler,
		getAddresses: getAddresses,
		logger:       logger,
		syncerLogger: syncerLogger,
		closeCh:      make(chan struct{}),
	}, nil
}

func (ci *cardanoIndexer) Start(ctx context.Context) {
	// bridging addresses must be known before any block is processed, otherwise txs would be missed
	ci.refreshAddresses(ctx, true)

	go ci.refreshAddressesLoop(ctx)

	for {
		syncer := gouroboros.NewBlockSyncer(&gouroboros.BlockSyncerConfig{
			NetworkMagic:   ci.networkMagic,
			NodeAddress:    ci.config.NetworkAddress,
			RestartOnError: true,
			RestartDelay:   cardanoSyncerRestartDelay,
			SyncStartTries: cardanoSyncStartTries,
			KeepAlive:      cardanoSyncerKeepAlive,
		}, ci.handler, ci.syncerLogger.Named("block_syncer"))

		ci.syncerCloseLock.Lock()
		ci.syncer = syncer
		ci.syncerCloseLock.Unlock()

		ci.handler.resetAttempts = 0

		if err := syncer.Sync(); err != nil {
			ci.logger.Error("Failed to start syncer", "chain", ci.config.ChainID, "err", err)
		} else {
			select {
			case <-ctx.Done():
			case <-ci.closeCh:
			case err := <-syncer.ErrorCh():
				ci.logger.Error("Syncer stopped", "chain", ci.config.ChainID, "err", err)
			}
		}

		_ = syncer.Close()

		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(cardanoSyncerRestartDelay):
		}
	}
}

func (ci *cardanoIndexer) Close() {
	ci.closeOnce.Do(func() {
		close(ci.closeCh)

		ci.syncerCloseLock.Lock()
		defer ci.syncerCloseLock.Unlock()

		if ci.syncer != nil {
			_ = ci.syncer.Close()
		}
	})
}

func (ci *cardanoIndexer) refreshAddressesLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(ci.config.AddressesRefreshInterval):
			ci.refreshAddresses(ctx, false)
		}
	}
}

func (ci *cardanoIndexer) refreshAddresses(ctx context.Context, untilSuccess bool) {
	for {
		addresses, err := ci.getAddresses(ctx, ci.config.ChainID)
		if err == nil && len(addresses) > 0 {
			ci.handler.setAddresses(addresses)
			ci.logger.Debug("Bridging addresses refreshed", "chain", ci.config.ChainID, "addresses", addresses)

			return
		}

		ci.logger.Warn("Failed to retrieve bridging addresses", "chain", ci.config.ChainID, "err", err)

		if !untilSuccess {
			return
		}

		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(cardanoSyncerRestartDelay):
		}
	}
}
