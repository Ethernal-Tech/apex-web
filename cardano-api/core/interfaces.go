package core

import "context"

type APIController interface {
	GetPathPrefix() string
	GetEndpoints() []*APIEndpoint
}

type API interface {
	Start(context.Context)
	Dispose() error
}
