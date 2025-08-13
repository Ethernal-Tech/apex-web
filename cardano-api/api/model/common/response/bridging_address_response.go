package response

type BridgingAddressResponse struct {
	// Chain ID
	ChainID string `json:"chainID"`
	// Bridging address index
	AddressIndex uint8 `json:"addressIndex"`
	// Bridging address
	Address string `json:"address"`
} // @name BridgingAddressResponse

func NewBridgingAddressResponse(
	chainID string, addressIndex uint8, address string,
) *BridgingAddressResponse {
	return &BridgingAddressResponse{
		ChainID:      chainID,
		AddressIndex: addressIndex,
		Address:      address,
	}
}
