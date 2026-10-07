package txindexer

import (
	"fmt"
	"sync"

	"github.com/fxamacker/cbor/v2"
)

// The metadata parsing below mirrors apex-bridge (common/metadata.go), so a tx is read here
// the same way the oracle reads it.

const (
	bridgingTxTypeBridgingRequest = "bridge"
	metadataMapKey                = 1
	alonzoAuxiliaryDataTag        = 259
)

type bridgingRequestMetadataTransaction struct {
	Address                     []string `cbor:"a" json:"a"`
	IsNativeTokenOnSrc_Obsolete byte     `cbor:"nt" json:"nt"` //nolint:stylecheck
	Amount                      uint64   `cbor:"m" json:"m"`
	TokenID                     uint16   `cbor:"t" json:"t"`
}

type bridgingRequestMetadata struct {
	BridgingTxType     string                               `cbor:"t" json:"t"`
	DestinationChainID string                               `cbor:"d" json:"d"`
	SenderAddr         []string                             `cbor:"s" json:"s"`
	Transactions       []bridgingRequestMetadataTransaction `cbor:"tx" json:"tx"`
	BridgingFee        uint64                               `cbor:"fa" json:"fa"`
	OperationFee       uint64                               `cbor:"of" json:"of"`
}

var getAuxiliaryDataDecMode = sync.OnceValues(func() (cbor.DecMode, error) {
	return cbor.DecOptions{
		DupMapKey:       cbor.DupMapKeyEnforcedAPF,
		MaxNestedLevels: 65535,
	}.DecMode()
})

// parseBridgingRequestMetadata returns nil metadata (without error) if the tx is not a bridging request
func parseBridgingRequestMetadata(data []byte) (*bridgingRequestMetadata, error) {
	if len(data) == 0 {
		return nil, nil
	}

	metadata, err := unmarshalAuxiliaryData[bridgingRequestMetadata](data)
	if err != nil {
		return nil, err
	}

	if metadata.BridgingTxType != bridgingTxTypeBridgingRequest {
		return nil, nil
	}

	return metadata, nil
}

// unmarshalAuxiliaryData resolves a cardano transaction's auxiliary_data envelope and decodes the
// metadatum stored under metadataMapKey. Accepted encodings:
//
//	metadata                                                        ; shelley
//	[ metadata, [* native_script] ]                                 ; shelley-ma
//	#6.259({ ?0: metadata, ?1: [* native_script], ?2: .., ?3: .. }) ; alonzo and later
func unmarshalAuxiliaryData[T any](data []byte) (*T, error) {
	decMode, err := getAuxiliaryDataDecMode()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize CBOR decoder mode: %w", err)
	}

	metadataMap := cbor.RawMessage(data)

	var (
		tagged   cbor.RawTag
		scripted []cbor.RawMessage
	)

	switch {
	case decMode.Unmarshal(data, &tagged) == nil:
		if tagged.Number != alonzoAuxiliaryDataTag {
			return nil, fmt.Errorf("unexpected auxiliary_data tag: %d", tagged.Number)
		}

		var fields map[uint64]cbor.RawMessage
		if err := decMode.Unmarshal(tagged.Content, &fields); err != nil {
			return nil, fmt.Errorf("failed to unmarshal auxiliary_data, err: %w", err)
		}

		var exists bool
		if metadataMap, exists = fields[0]; !exists {
			return nil, fmt.Errorf("invalid metadata")
		}
	case decMode.Unmarshal(data, &scripted) == nil:
		if len(scripted) == 0 {
			return nil, fmt.Errorf("invalid metadata")
		}

		metadataMap = scripted[0]
	}

	var labels map[uint64]cbor.RawMessage
	if err := decMode.Unmarshal(metadataMap, &labels); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata, err: %w", err)
	}

	raw, exists := labels[metadataMapKey]
	if !exists {
		return nil, fmt.Errorf("invalid metadata")
	}

	var metadata T
	if err := decMode.Unmarshal(raw, &metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata, err: %w", err)
	}

	return &metadata, nil
}
