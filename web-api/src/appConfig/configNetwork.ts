/** Network the running instance serves, selected by app.isMainnet. */
export enum ConfigNetworkEnum {
	Mainnet = 'mainnet',
	Testnet = 'testnet',
}

export const configNetworkOf = (isMainnet: boolean): ConfigNetworkEnum =>
	isMainnet ? ConfigNetworkEnum.Mainnet : ConfigNetworkEnum.Testnet;
