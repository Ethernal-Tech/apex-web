import { AuthControllerClient, GenerateLoginCodeDto, LoginDto } from '../../swagger/apexBridgeApiService'

export const generateLoginCodeAction = (model: GenerateLoginCodeDto) => {
	const client = new AuthControllerClient();
	return client.generateLoginCode(model);
}

export const loginAction = (model: LoginDto) => {
	const client = new AuthControllerClient();
	return client.login(model);
}