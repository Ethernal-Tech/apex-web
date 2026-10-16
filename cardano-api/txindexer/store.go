package txindexer

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"time"

	"go.etcd.io/bbolt"
)

var (
	bridgingTxsBucket     = []byte("BridgingTxs")
	bridgingTxsByHash     = []byte("BridgingTxsByHash")
	cardanoBlockPoints    = []byte("CardanoBlockPoints")
	errBridgingTxNotFound = fmt.Errorf("bridging tx not found")
)

type BBoltStore struct {
	db *bbolt.DB
}

var _ BridgingTxsStore = (*BBoltStore)(nil)

func NewBBoltStore(filePath string) (*BBoltStore, error) {
	db, err := bbolt.Open(filePath, 0600, &bbolt.Options{Timeout: time.Second})
	if err != nil {
		return nil, fmt.Errorf("could not open db %s: %w", filePath, err)
	}

	err = db.Update(func(tx *bbolt.Tx) error {
		for _, bn := range [][]byte{bridgingTxsBucket, bridgingTxsByHash, cardanoBlockPoints} {
			if _, err := tx.CreateBucketIfNotExists(bn); err != nil {
				return fmt.Errorf("could not create bucket %s: %w", string(bn), err)
			}
		}

		return nil
	})
	if err != nil {
		_ = db.Close()

		return nil, err
	}

	return &BBoltStore{db: db}, nil
}

func (s *BBoltStore) Close() error {
	return s.db.Close()
}

func (s *BBoltStore) AddBridgingTxs(txs []*BridgingTx) error {
	if len(txs) == 0 {
		return nil
	}

	return s.db.Update(func(tx *bbolt.Tx) error {
		txsBucket, hashBucket := tx.Bucket(bridgingTxsBucket), tx.Bucket(bridgingTxsByHash)

		for _, bridgingTx := range txs {
			hashKey := txHashKey(bridgingTx.OriginChainID, bridgingTx.TxHash)

			if seqBytes := hashBucket.Get(hashKey); seqBytes != nil {
				existing, err := unmarshalBridgingTx(txsBucket.Get(seqBytes))
				if err != nil {
					return err
				}

				// tx hash commits to the whole tx, so only its location can differ (e.g. after a rollback)
				if existing.sameLocation(bridgingTx) {
					continue
				}

				existing.BlockNumber = bridgingTx.BlockNumber
				existing.BlockHash = bridgingTx.BlockHash
				existing.TTL = bridgingTx.TTL

				if err := putBridgingTx(txsBucket, seqBytes, existing); err != nil {
					return err
				}

				continue
			}

			seq, err := txsBucket.NextSequence()
			if err != nil {
				return fmt.Errorf("could not get next sequence: %w", err)
			}

			bridgingTx.Seq = seq
			if bridgingTx.IndexedAt.IsZero() {
				bridgingTx.IndexedAt = time.Now().UTC()
			}

			seqBytes := uint64ToBytes(seq)

			if err := putBridgingTx(txsBucket, seqBytes, bridgingTx); err != nil {
				return err
			}

			if err := hashBucket.Put(hashKey, seqBytes); err != nil {
				return fmt.Errorf("could not save tx hash index: %w", err)
			}
		}

		return nil
	})
}

func (s *BBoltStore) GetBridgingTxs(after uint64, limit int) (*BridgingTxsPage, error) {
	page := &BridgingTxsPage{}

	err := s.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket(bridgingTxsBucket)
		cursor := bucket.Cursor()

		page.CurrentSeq = bucket.Sequence()

		if k, _ := cursor.First(); k != nil {
			page.OldestSeq = binary.BigEndian.Uint64(k)
		}

		for k, v := cursor.Seek(uint64ToBytes(after + 1)); k != nil && len(page.Txs) < limit; k, v = cursor.Next() {
			bridgingTx, err := unmarshalBridgingTx(v)
			if err != nil {
				return err
			}

			page.Txs = append(page.Txs, bridgingTx)
		}

		return nil
	})

	return page, err
}

func (s *BBoltStore) PruneBridgingTxs(indexedBefore time.Time) (cnt int, err error) {
	err = s.db.Update(func(tx *bbolt.Tx) error {
		txsBucket, hashBucket := tx.Bucket(bridgingTxsBucket), tx.Bucket(bridgingTxsByHash)
		cursor := txsBucket.Cursor()

		// sequence numbers are assigned in indexing order, so pruning can stop at the first newer tx.
		// The last tx is never removed so the sequence position stays visible to web-api
		for k, v := cursor.First(); k != nil; k, v = cursor.First() {
			if nextKey, _ := cursor.Next(); nextKey == nil {
				break
			}

			bridgingTx, err := unmarshalBridgingTx(v)
			if err != nil {
				return err
			}

			if !bridgingTx.IndexedAt.Before(indexedBefore) {
				break
			}

			if err := hashBucket.Delete(txHashKey(bridgingTx.OriginChainID, bridgingTx.TxHash)); err != nil {
				return err
			}

			if err := txsBucket.Delete(k); err != nil {
				return err
			}

			cnt++
		}

		return nil
	})

	return cnt, err
}

// GetCardanoBlockPoints returns the recently observed blocks of a cardano chain, ordered by slot
func (s *BBoltStore) GetCardanoBlockPoints(chainID string) (points []cardanoBlockPoint, err error) {
	err = s.db.View(func(tx *bbolt.Tx) error {
		data := tx.Bucket(cardanoBlockPoints).Get([]byte(chainID))
		if data == nil {
			return nil
		}

		return json.Unmarshal(data, &points)
	})

	return points, err
}

func (s *BBoltStore) SetCardanoBlockPoints(chainID string, points []cardanoBlockPoint) error {
	data, err := json.Marshal(points)
	if err != nil {
		return err
	}

	return s.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(cardanoBlockPoints).Put([]byte(chainID), data)
	})
}

func putBridgingTx(bucket *bbolt.Bucket, key []byte, bridgingTx *BridgingTx) error {
	data, err := json.Marshal(bridgingTx)
	if err != nil {
		return fmt.Errorf("could not marshal bridging tx: %w", err)
	}

	if err := bucket.Put(key, data); err != nil {
		return fmt.Errorf("could not save bridging tx: %w", err)
	}

	return nil
}

func unmarshalBridgingTx(data []byte) (*BridgingTx, error) {
	if data == nil {
		return nil, errBridgingTxNotFound
	}

	var bridgingTx BridgingTx

	if err := json.Unmarshal(data, &bridgingTx); err != nil {
		return nil, fmt.Errorf("could not unmarshal bridging tx: %w", err)
	}

	return &bridgingTx, nil
}

func txHashKey(chainID, txHash string) []byte {
	return []byte(chainID + "_" + txHash)
}

func uint64ToBytes(value uint64) []byte {
	result := make([]byte, 8)
	binary.BigEndian.PutUint64(result, value)

	return result
}
