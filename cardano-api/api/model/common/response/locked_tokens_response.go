package response

type LockedTokensResponse struct {
	Chains map[string]map[string]map[string]string `json:"chains"`
}

func NewLockedTokensResponse(chains map[string]map[string]map[string]string) *LockedTokensResponse {
	return &LockedTokensResponse{
		Chains: chains,
	}
}
