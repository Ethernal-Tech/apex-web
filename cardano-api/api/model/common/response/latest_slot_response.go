package response

import "strconv"

type LatestSlotResponse struct {
	// Current chain tip slot
	Slot string `json:"slot"`
} // @name LatestSlotResponse

func NewLatestSlotResponse(slot uint64) *LatestSlotResponse {
	return &LatestSlotResponse{
		Slot: strconv.FormatUint(slot, 10),
	}
}
