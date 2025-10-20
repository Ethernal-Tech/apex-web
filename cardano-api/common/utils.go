package common

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/indexer"
	"github.com/ethereum/go-ethereum/common"
	"github.com/sethvargo/go-retry"
)

type VCRunMode string // @name VCRunMode
type TokenName string

const (
	ReactorMode VCRunMode = "reactor"
	SkylineMode VCRunMode = "skyline"
)

const (
	AdaToken   TokenName = "Ada"
	WAdaToken  TokenName = "WAda"
	APEXToken  TokenName = "APEX"
	WAPEXToken TokenName = "WAPEX"
)

const (
	EthZeroAddr = "0x0000000000000000000000000000000000000000"

	MinUTxODefaultValue = uint64(1_000_000)
)

const (
	DfmDecimals = 6
	WeiDecimals = 18
)

func IsValidHTTPURL(input string) bool {
	u, err := url.Parse(input)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return false
	}

	return IsValidNetworkAddress(u.Host)
}

func IsValidNetworkAddress(input string) bool {
	host, port, err := net.SplitHostPort(input)
	if err != nil {
		// If there's an error, it might be because the port is not included, so treat the input as the host
		if !strings.Contains(err.Error(), "missing port in address") {
			return false
		}

		host = input
	} else if portVal, err := strconv.ParseInt(port, 10, 32); err != nil || portVal < 0 {
		return false
	}

	// Check if host is a valid IP address
	if net.ParseIP(host) != nil {
		return true
	}

	// Check if the host is a valid domain name by trying to resolve it
	_, err = net.LookupHost(host)

	return err == nil
}

func HexToAddress(s string) common.Address {
	return common.HexToAddress(s)
}

func DecodeHex(s string) ([]byte, error) {
	if strings.HasPrefix(s, "0x") || strings.HasPrefix(s, "0X") {
		s = s[2:]
	}

	return hex.DecodeString(s)
}

func GetRequiredSignaturesForConsensus(cnt uint64) uint64 {
	return (cnt*2 + 2) / 3
}

// the context is cancelled or expired.
func RetryForever(ctx context.Context, interval time.Duration, fn func(context.Context) error) error {
	err := retry.Do(ctx, retry.NewConstant(interval), func(context.Context) error {
		// Execute function and end retries if no error or context done
		err := fn(ctx)
		if IsContextDoneErr(err) {
			return err
		}

		if err == nil {
			return nil
		}

		// Retry on all other errors
		return retry.RetryableError(err)
	})

	return err
}

type IsRecoverableErrorFn func(err error) bool

var ErrExecutionTimeout = errors.New("timeout while trying to execute with retry")

func OgmiosIsRecoverableError(err error) bool {
	return strings.Contains(err.Error(), "status code 500")
}

// IsContextDoneErr returns true if the error is due to the context being cancelled
// or expired. This is useful for determining if a function should retry.
func IsContextDoneErr(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

// SplitString splits large string into slice of substrings
func SplitString(s string, mxlen int) (res []string) {
	for i := 0; i < len(s); i += mxlen {
		end := i + mxlen
		if end > len(s) {
			end = len(s)
		}

		res = append(res, s[i:end])
	}

	return res
}

// MulPercentage multuple value with percentage and divide with 100
func MulPercentage(value *big.Int, percentage uint64) *big.Int {
	res := new(big.Int).Mul(value, new(big.Int).SetUint64(percentage))

	return res.Div(res, big.NewInt(100))
}

// SafeSubtract subtracts safely two uint64 value and return default value if we have overflow
func SafeSubtract(a, b, def uint64) uint64 {
	if a >= b {
		return a - b
	}

	return def
}

func MustHashToBytes32(hash string) (res [32]byte) {
	return indexer.NewHashFromHexString(hash)
}

func HTTPGet[TResponse any](ctx context.Context, requestURL string, apiKey string) (t TResponse, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return t, err
	}

	return executeHTTPCall[TResponse](req, apiKey)
}

func HTTPPost[TBody any, TResponse any](
	ctx context.Context, requestURL string, payload TBody, apiKey string,
) (t TResponse, err error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return t, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, bytes.NewBuffer(body))
	if err != nil {
		return t, err
	}

	return executeHTTPCall[TResponse](req, apiKey)
}

func Map[T, V any](items []T, fn func(T) V) []V {
	if items == nil {
		return nil
	}

	result := make([]V, len(items))

	for i, x := range items {
		result[i] = fn(x)
	}

	return result
}

func WeiToDfm(wei *big.Int) *big.Int {
	dfm := new(big.Int).Set(wei)
	base := big.NewInt(10)
	dfm.Div(dfm, base.Exp(base, big.NewInt(WeiDecimals-DfmDecimals), nil))

	return dfm
}

func executeHTTPCall[TResponse any](req *http.Request, apiKey string) (t TResponse, err error) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return t, err
	} else if resp.StatusCode != http.StatusOK {
		return t, fmt.Errorf("http status for %s code is %d", req.URL.String(), resp.StatusCode)
	}

	resBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return t, err
	}

	var responseModel TResponse

	err = json.Unmarshal(resBody, &responseModel)
	if err != nil {
		return t, err
	}

	return responseModel, nil
}
