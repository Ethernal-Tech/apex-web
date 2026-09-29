export const apexID = 1;
export const adaID = 2;
export const capexID = 3;
export const xadaID = 4;
export const bapexID = 1000002;
export const bnapexID = 1000003;

export const isAdaToken = (tokenID: number): boolean =>
	tokenID === adaID || tokenID === xadaID;

export const isApexToken = (tokenID: number): boolean =>
	tokenID === apexID ||
	tokenID === capexID ||
	tokenID === bnapexID ||
	tokenID === bapexID;
