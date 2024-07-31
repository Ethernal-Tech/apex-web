package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api/utils"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/hashicorp/go-hclog"
)

type APIImpl struct {
	ctx       context.Context
	apiConfig core.APIConfig
	handler   http.Handler
	server    *http.Server
	logger    hclog.Logger
}

var _ core.API = (*APIImpl)(nil)

func NewAPI(
	ctx context.Context, apiConfig core.APIConfig,
	controllers []core.APIController, logger hclog.Logger,
) (
	*APIImpl, error,
) {
	headersOk := handlers.AllowedHeaders(apiConfig.AllowedHeaders)
	originsOk := handlers.AllowedOrigins(apiConfig.AllowedOrigins)
	methodsOk := handlers.AllowedMethods(apiConfig.AllowedMethods)

	router := mux.NewRouter().StrictSlash(true)

	for _, controller := range controllers {
		controllerPathPrefix := controller.GetPathPrefix()
		endpoints := controller.GetEndpoints()

		for _, endpoint := range endpoints {
			endpointPath := fmt.Sprintf("/%s/%s/%s", apiConfig.PathPrefix, controllerPathPrefix, endpoint.Path)

			endpointHandler := endpoint.Handler
			if endpoint.APIKeyAuth {
				endpointHandler = withAPIKeyAuth(apiConfig, endpointHandler, logger)
			}

			router.HandleFunc(endpointPath, endpointHandler).Methods(endpoint.Method)

			logger.Debug("Registered api endpoint", "endpoint", endpointPath, "method", endpoint.Method)
		}
	}

	handler := handlers.CORS(originsOk, headersOk, methodsOk)(router)

	return &APIImpl{
		ctx:       ctx,
		apiConfig: apiConfig,
		handler:   handler,
		logger:    logger,
	}, nil
}

func (api *APIImpl) Start() {
	api.logger.Debug("Starting api")
	api.server = &http.Server{
		Addr:              fmt.Sprintf(":%d", api.apiConfig.Port),
		Handler:           api.handler,
		ReadHeaderTimeout: 3 * time.Second,
	}

	err := api.server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		api.logger.Error("error while trying to start api server", "err", err)
	}

	api.logger.Debug("Started api")
}

func (api *APIImpl) Dispose() error {
	err := api.server.Shutdown(context.Background())
	api.logger.Debug("Stopped api")

	if err != nil {
		api.logger.Error("error while trying to shutdown api server", "err", err)

		return fmt.Errorf("error while trying to shutdown api server. err %w", err)
	}

	return nil
}

func withAPIKeyAuth(
	apiConfig core.APIConfig, handler core.APIEndpointHandler, logger hclog.Logger,
) core.APIEndpointHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKeyHeaderValue := r.Header.Get(apiConfig.APIKeyHeader)
		if apiKeyHeaderValue == "" {
			err := utils.WriteUnauthorizedResponse(w)
			if err != nil {
				logger.Error("error while WriteUnauthorizedResponse", "err", err)
			}

			return
		}

		authorized := false

		for _, apiKey := range apiConfig.APIKeys {
			if apiKey == apiKeyHeaderValue {
				authorized = true

				break
			}
		}

		if !authorized {
			err := utils.WriteUnauthorizedResponse(w)
			if err != nil {
				logger.Error("error while WriteUnauthorizedResponse", "err", err)
			}

			return
		}

		handler(w, r)
	}
}
