import {
	adaID,
	apexID,
	bapexID,
	bnapexID,
	capexID,
	xadaID,
} from '../../settings/token';

export const isAdaToken = (tokenID: number): boolean => {
	return tokenID === adaID || tokenID === xadaID;
};

export const isApexToken = (tokenID: number): boolean => {
	return (
		tokenID === apexID ||
		tokenID === capexID ||
		tokenID === bnapexID ||
		tokenID === bapexID
	);
};
