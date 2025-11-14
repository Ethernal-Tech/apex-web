package common

// ChainSpecificConfig defines the interface for chain-specific configurations
type ChainSpecificConfig interface {
	GetChainType() string
}

type ValidatorChangeTracker interface {
	SetValidatorChangeStatus(inProgress bool)
	IsValidatorChangeInProgress() bool
}
