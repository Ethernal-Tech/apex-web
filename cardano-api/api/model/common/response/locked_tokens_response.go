package response

type LockedTokensResponse struct {
	Chains map[string]map[string]uint64 `json:"chains"`
}

func NewLockedTokensResponse(chains map[string]map[string]uint64) *LockedTokensResponse {
	return &LockedTokensResponse{
		Chains: chains,
	}
}
