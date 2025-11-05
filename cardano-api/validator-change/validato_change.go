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
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(30000 * time.Millisecond):
			err := v.getValidatorChangeStatus(ctx)
			if err != nil {
				v.logger.Error("error while fetching validator change status", "err", err)
			}
		}
	}
}

func (v *validatorChange) getValidatorChangeStatus(ctx context.Context) error {
	validatorChangeStatusRequestURL := fmt.Sprintf("%s/api/Settings/GetValidatorChangeStatus", v.appConfig.OracleAPI.URL)

	validatorChangeStatusReponse, err := common.HTTPGet[*response.ValidatorChangeStatusReponse](
		ctx, validatorChangeStatusRequestURL, v.appConfig.OracleAPI.APIKey)
	if err != nil {
		return err
	}

	if !validatorChangeStatusReponse.InProgress &&
		v.validatorChangeTracker.IsValidatorChangeInProgress() != validatorChangeStatusReponse.InProgress {
		if err := v.getMultiSigAddr(ctx); err != nil {
			return err
		}
	}

	v.validatorChangeTracker.SetValidatorChangeStatus(validatorChangeStatusReponse.InProgress)

	return nil
}

func (v *validatorChange) getMultiSigAddr(ctx context.Context) error {
	multiSigAddrRequestURL := fmt.Sprintf("%s/api/Settings/GetMultiSigBridgingAddr", v.appConfig.OracleAPI.URL)

	multiSigAddrReponse, err := common.HTTPGet[*response.MultiSigAddressesResponse](
		ctx, multiSigAddrRequestURL, v.appConfig.OracleAPI.APIKey)
	if err != nil {
		return err
	}

	v.appConfig.UpdateCardanoBridgingAddresses(v.logger, multiSigAddrReponse.CardanoChains)
	return nil
}
