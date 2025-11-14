package validatorchange

import (
	"context"
	"fmt"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api/model/response"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/hashicorp/go-hclog"
)

const vsStatusPollTime = 30 * time.Second // 30 seconds poll time for validator change status

type validatorChange struct {
	logger                 hclog.Logger
	appConfig              *core.AppConfig
	validatorChangeTracker common.ValidatorChangeTracker
}

func NewValidatorChange(
	ctx context.Context,
	logger hclog.Logger,
	appConfig *core.AppConfig,
	tracker common.ValidatorChangeTracker) *validatorChange {
	return &validatorChange{
		logger:                 logger,
		appConfig:              appConfig,
		validatorChangeTracker: tracker,
	}
}

func (v *validatorChange) Start(ctx context.Context) {
	err := v.setValidatorChangeStatus(ctx)
	if err != nil {
		v.logger.Error("error while fetching validator change status", "err", err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(vsStatusPollTime):
			err := v.setValidatorChangeStatus(ctx)
			if err != nil {
				v.logger.Error("error while fetching validator change status", "err", err)
			}
		}
	}
}

func (v *validatorChange) setValidatorChangeStatus(ctx context.Context) error {
	validatorChangeStatusRequestURL := fmt.Sprintf("%s/api/Settings/GetValidatorChangeStatus", v.appConfig.OracleAPI.URL)

	validatorChangeStatusReponse, err := common.HTTPGet[*response.ValidatorChangeStatusReponse](
		ctx, validatorChangeStatusRequestURL, v.appConfig.OracleAPI.APIKey)
	if err != nil {
		return err
	}

	if !validatorChangeStatusReponse.InProgress &&
		v.validatorChangeTracker.IsValidatorChangeInProgress() != validatorChangeStatusReponse.InProgress {
		if err := v.appConfig.FetchAndUpdateMultiSigAddresses(ctx, v.logger); err != nil {
			return err
		}
	}

	v.validatorChangeTracker.SetValidatorChangeStatus(validatorChangeStatusReponse.InProgress)

	return nil
}
