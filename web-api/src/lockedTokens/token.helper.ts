import { ChainEnum } from 'src/common/enum';

export const skylineChains = (): ChainEnum[] => {
	return [ChainEnum.Prime, ChainEnum.Cardano];
};

export const layerZeroChains = (): ChainEnum[] => {
	return [ChainEnum.Nexus, ChainEnum.Base, ChainEnum.BNB];
};
