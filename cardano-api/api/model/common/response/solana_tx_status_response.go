package response

type SolanaTxStatus string

const (
	// SolanaTxStatusPending: not in a confirmed block yet and its blockhash is still valid
	SolanaTxStatusPending SolanaTxStatus = "pending"
	// SolanaTxStatusConfirmed: in a confirmed or finalized block, executed without error
	SolanaTxStatusConfirmed SolanaTxStatus = "confirmed"
	// SolanaTxStatusFailed: in a block, but its execution failed
	SolanaTxStatusFailed SolanaTxStatus = "failed"
	// SolanaTxStatusExpired: not found and its blockhash has expired, so it can never land
	SolanaTxStatusExpired SolanaTxStatus = "expired"
)

type SolanaTxStatusResponse struct {
	// One of pending, confirmed, failed, expired
	Status SolanaTxStatus `json:"status" enums:"pending,confirmed,failed,expired" swaggertype:"string"`
	// Execution error reported by the node, set only when status is failed
	Err string `json:"err,omitempty"`
} // @name SolanaTxStatusResponse
