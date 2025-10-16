package core

import "context"

type APIController interface {
	GetPathPrefix() string
	GetEndpoints() []*APIEndpoint
}

type API interface {
	Start(ctx context.Context)
	Dispose() error
}
