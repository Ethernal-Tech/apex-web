import WalletHandler from "../features/WalletHandler";
import { generateLoginCodeAction, loginAction } from "../pages/Login/action";
import { setTokenAction } from "../redux/slices/tokenSlice";
import { setWalletAction } from "../redux/slices/walletSlice";
import { ChainEnum, DataSignatureDto, GenerateLoginCodeDto, LoginDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch } from 'redux';
import { logout } from "./logout";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, dispatch: Dispatch) => {
    try {
        const wallet = await WalletHandler.enable(selectedWalletName);
        const success = WalletHandler.checkWallet(wallet);
        if (success) {
            dispatch(setWalletAction(selectedWalletName));
        }

        return success;
    } catch (e) {
        console.log(e)
    }

    WalletHandler.clearEnabledWallet()

    return false;
}

export const onLoad = async (selectedWalletName: string, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await enableWallet(selectedWalletName, dispatch);
    !success && logout(dispatch);
}

export const login = async (selectedWalletName: string, chainId: ChainEnum, dispatch: Dispatch) => {
    const success = await enableWallet(selectedWalletName, dispatch);
    if (!success) {
        return false;
    }

    try {
        const wallet = await WalletHandler.getEnabledWallet();
        if (!wallet) {
            return false;
        }
        // TODO: this probably should not be stake address
        const stakeAddress = await WalletHandler.getStakeAddress(wallet);
        const address = stakeAddress.to_bech32();
        const bindedGenerateLoginCodeAction = generateLoginCodeAction.bind(null, new GenerateLoginCodeDto({
            address, chainId,
        }));
        const loginCode = await tryCatchJsonByAction(bindedGenerateLoginCodeAction, dispatch);
        if (!loginCode) {
            return false;
        }
        const messageHex = Buffer.from(loginCode.code).toString("hex");

        const signedData = await wallet.signData(address, messageHex);
        const loginModel = new LoginDto({
            address,
            signedLoginCode: new DataSignatureDto(signedData),
            chainId,
        });
        
        const bindedLoginAction = loginAction.bind(null, loginModel);
        const token = await tryCatchJsonByAction(bindedLoginAction, dispatch);

        if (!token) {
            return false;
        }

        dispatch(setTokenAction(token));

        return true;

    }
    catch (err: any) {
        if (err instanceof Error) {
            console.log(err.stack)
        }
    }

    return false;
}