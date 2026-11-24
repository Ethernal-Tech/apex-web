package response

type SolanaTokenBalanceResponse struct {
	// SPL token mint address (base58)
	Mint string `json:"mint"`
	// Raw token amount held in the owner's associated token account
	Amount string `json:"amount"`
} // @name SolanaTokenBalanceResponse

type SolanaAddressBalanceResponse struct {
	Chain   string `json:"chain"`
	Address string `json:"address"`
	// Native balance in lamports
	Amount string `json:"amount"`
	// Balances of the SPL tokens configured for the chain, zero when the account does not exist
	Tokens []SolanaTokenBalanceResponse `json:"tokens"`
} // @name SolanaAddressBalanceResponse
