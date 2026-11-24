package controllers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api/utils"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	solanawallet "github.com/Ethernal-Tech/solana-infrastructure/wallet"
	cache "github.com/dgraph-io/ristretto"
	"github.com/gagliardetto/solana-go"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/sync/singleflight"
)

const (
	getBalancePath = "GetBalance"

	// Frontends poll balances on an interval; caching per address keeps the RPC load
	// independent of how many tabs or users poll the same address.
	solanaBalanceCacheDuration = 10 * time.Second
	solanaBalanceTimeout       = 20 * time.Second
)

// SolanaControllerImpl serves Solana chain reads to the frontends, so every Solana RPC
// call goes through the chain's rate-limited tx provider.
type SolanaControllerImpl struct {
	appConfig     *core.AppConfig
	balanceCache  *cache.Cache
	balanceFlight singleflight.Group
	logger        hclog.Logger
}

var _ core.APIController = (*SolanaControllerImpl)(nil)

func NewSolanaController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *SolanaControllerImpl {
	balanceCache, err := cache.NewCache(&cache.Config{
		NumCounters: 100_000, // recommended: 10x the number of items you expect to store
		MaxCost:     10_000,  // every entry costs 1, so at most 10k addresses
		BufferItems: 64,
	})
	if err != nil {
		logger.Warn("can't initialise a new cache", "err", err)
	}

	return &SolanaControllerImpl{
		appConfig:    appConfig,
		balanceCache: balanceCache,
		logger:       logger,
	}
}

func (*SolanaControllerImpl) GetPathPrefix() string {
	return "Solana"
}

func (c *SolanaControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: getBalancePath, Method: http.MethodGet, Handler: c.getBalance},
	}
}

// @Summary Get address balance for a Solana chain
// @Description Returns the lamport balance and the balances of the SPL tokens configured for the chain, read from the owner's associated token accounts. Responses are cached per address for a few seconds.
// @Tags Solana
// @Produce json
// @Param chainId query string true "Solana chain ID"
// @Param address query string true "Base58 wallet address"
// @Success 200 {object} response.SolanaAddressBalanceResponse "OK - Address balance."
// @Failure 400 {object} response.ErrorResponse "Bad Request – missing/invalid query params or unsupported chain."
// @Failure 401 {object} response.ErrorResponse "Unauthorized – API key missing or invalid."
// @Failure 500 {object} response.ErrorResponse "Internal server error – the balance lookup failed."
// @Security ApiKeyAuth
// @Router /Solana/GetBalance [get]
func (c *SolanaControllerImpl) getBalance(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getBalance request", "url", r.URL)

	query := r.URL.Query()
	chainID := strings.TrimSpace(query.Get("chainId"))
	address := strings.TrimSpace(query.Get("address"))

	if chainID == "" {
		utils.WriteErrorResponse(w, r, http.StatusBadRequest, errors.New("chainId missing from query"), c.logger)

		return
	}

	if address == "" {
		utils.WriteErrorResponse(w, r, http.StatusBadRequest, errors.New("address missing from query"), c.logger)

		return
	}

	if !common.IsSolanaChainID(chainID) {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, fmt.Errorf("unsupported chainId for GetBalance: %s", chainID), c.logger)

		return
	}

	_, _, chainConfig := c.appConfig.GetChainConfig(chainID)
	if chainConfig == nil || chainConfig.ChainSpecific == nil || chainConfig.ChainSpecific.TxProvider == nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, fmt.Errorf("chain is not configured or disabled: %s", chainID), c.logger)

		return
	}

	if err := solanawallet.ValidateAddress(address, false); err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, fmt.Errorf("invalid address for chain %s: %w", chainID, err), c.logger)

		return
	}

	owner := solana.MustPublicKeyFromBase58(address)
	cacheKey := chainID + "/" + owner.String()

	if c.balanceCache != nil {
		if cached, found := c.balanceCache.Get(cacheKey); found {
			utils.WriteResponse(w, r, http.StatusOK, cached, c.logger)

			return
		}
	}

	balance, err, _ := c.balanceFlight.Do(cacheKey, func() (any, error) {
		mints, err := c.configuredMints(chainID)
		if err != nil {
			return nil, err
		}

		// shared by every request waiting on this key, so one client going away must not cancel it
		ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), solanaBalanceTimeout)
		defer cancel()

		balance, err := utils.FetchSolanaAddressBalance(
			ctx, chainConfig.ChainSpecific.TxProvider, chainID, owner, mints)
		if err != nil {
			return nil, err
		}

		if c.balanceCache != nil {
			c.balanceCache.SetWithTTL(cacheKey, balance, 1, solanaBalanceCacheDuration)
		}

		return balance, nil
	})
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, fmt.Errorf("get balance: %w", err), c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, balance, c.logger)
}

// configuredMints returns the SPL mints of the tokens configured for chainID, sorted.
// Taking them from config rather than the request bounds the RPC calls per lookup.
func (c *SolanaControllerImpl) configuredMints(chainID string) ([]solana.PublicKey, error) {
	tokens, err := c.appConfig.SkylineBridgingSettings.GetTokens(chainID)
	if err != nil {
		return nil, err
	}

	mints := make([]solana.PublicKey, 0, len(tokens))

	for tokenID, tkn := range tokens {
		if tkn.ChainSpecific == cardanowallet.AdaTokenName {
			continue // the chain currency, SOL
		}

		mint, err := solana.PublicKeyFromBase58(tkn.ChainSpecific)
		if err != nil {
			return nil, fmt.Errorf("invalid mint for token %d on chain %s: %w", tokenID, chainID, err)
		}

		if !slices.ContainsFunc(mints, mint.Equals) {
			mints = append(mints, mint)
		}
	}

	slices.SortFunc(mints, func(a, b solana.PublicKey) int { return strings.Compare(a.String(), b.String()) })

	return mints, nil
}
