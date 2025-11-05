package core

import "sync"

type validatorChangeTracker struct {
	mu sync.RWMutex

	inProgress bool
}

func NewValidatorChangeTracker() *validatorChangeTracker {
	return &validatorChangeTracker{inProgress: true}
}

func (s *validatorChangeTracker) SetValidatorChangeStatus(inProgress bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.inProgress = inProgress
}

func (s *validatorChangeTracker) IsValidatorChangeInProgress() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.inProgress
}
