package response

type LockedTokensResponse struct {
	// Chains maps chain → token → address → amount (as string).
	Chains map[string]map[uint16]map[string]string `json:"chains"`
}

func NewLockedTokensResponse(chains map[string]map[uint16]map[string]string) *LockedTokensResponse {
	return &LockedTokensResponse{
		Chains: chains,
	}
}
