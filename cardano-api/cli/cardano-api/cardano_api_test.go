package clicardanoapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api/model/request"
	"github.com/Ethernal-Tech/cardano-api/api/model/response"
	"github.com/stretchr/testify/require"
)

func TestCardanoApiPerformance(t *testing.T) {
	t.Skip()

	const (
		threadsCnt      = 1000
		sequenceCnt     = 1
		port            = 41000
		url             = "api/CardanoTx/CreateBridgingTx"
		srcChainID      = "vector"
		dstChainID      = "prime"
		bridgingFee     = uint64(1_000_100)
		senderAddr      = "vector_test1vgrgxh4s35a5pdv0dc4zgq33crn34emnk2e7vnensf4tezq3tkm9m"
		receiverAddr    = "addr_test1vqeux7xwusdju9dvsj8h7mca9aup2k439kfmwy773xxc2hcu7zy99"
		authHeader      = "x-api-key"
		authHeaderValue = "test-cardano-api-key-1"
		timeout         = time.Second * 120
	)

	data := &request.CreateBridgingTxRequest{
		SourceChainID:      srcChainID,
		DestinationChainID: dstChainID,
		SenderAddr:         senderAddr,
		BridgingFee:        bridgingFee,
		Transactions: []request.CreateBridgingTxTransactionRequest{
			{
				Addr:   receiverAddr,
				Amount: uint64(2_000_000),
			},
		},
	}

	requestJsonData, err := json.Marshal(data)
	require.NoError(t, err)

	sendRequest := func() (result *response.BridgingTxResponse, err error) {
		fullUrl := fmt.Sprintf("http://localhost:%d/%s", port, url)
		client := &http.Client{Timeout: timeout}

		req, err := http.NewRequest("POST", fullUrl, bytes.NewBuffer(requestJsonData))
		if err != nil {
			return nil, err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set(authHeader, authHeaderValue)

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}

		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			var (
				errorResp response.ErrorResponse
				bytes     []byte
			)

			bytes, err = io.ReadAll(resp.Body)
			if err != nil {
				return nil, fmt.Errorf("error status: %d", resp.StatusCode)
			}

			if err := json.Unmarshal(bytes, &errorResp); err != nil {
				return nil, fmt.Errorf("error status: %d", resp.StatusCode)
			}

			return nil, fmt.Errorf("error: %s", errorResp.Err)
		}

		bytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(bytes, &result); err != nil {
			return nil, err
		}

		return result, nil
	}

	wg := sync.WaitGroup{}
	cntGood := uint64(0)
	cntBad := uint64(0)

	for i := 0; i < threadsCnt; i++ {
		wg.Add(1)

		go func(id int) {
			defer wg.Done()

			for j := 0; j < sequenceCnt; j++ {
				res, err := sendRequest()
				if err != nil {
					fmt.Printf("%d (%d) failed to create: %v\n", id, j, err)

					atomic.AddUint64(&cntBad, 1)
				} else {
					fmt.Printf("%d (%d) creates %s\n", id, j, res.TxHash)

					atomic.AddUint64(&cntGood, 1)
				}
			}
		}(i)
	}

	wg.Wait()

	fmt.Printf("Threads: %d\n", threadsCnt)
	fmt.Printf("Sequences: %d\n", sequenceCnt)
	fmt.Printf("Good: %d\n", atomic.LoadUint64(&cntGood))
	fmt.Printf("Bad: %d\n", atomic.LoadUint64(&cntBad))
}
