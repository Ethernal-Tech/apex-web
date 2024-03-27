import appSettings from "../appSettings";

export type AddressBalanceRequestModel = {
    address: string,
    chainId: string,
}

export type BridgeBalanceRequestModel = {
    chainId: string,
}

export const requestAddressBalanceAction = async (requestModel: AddressBalanceRequestModel) => {

    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Content-Type', 'application/json');
    requestHeaders.set('Accept', 'application/json');

    const requestInit: RequestInit = {
        method: 'GET',
        headers: requestHeaders,
    };

    try {
        const response = await fetch(
            `${appSettings.apiUrl}/api/userBalance?address=${requestModel.address}&chainId=${requestModel.chainId}`,
            requestInit,
        );
        const jsonResponse = await response.json();
        return Number.isInteger(jsonResponse?.message) ? jsonResponse.message : undefined;
    }
    catch (e) {
        console.log('Failed startTxAction: ', e);
    }
}

export const requestBridgeBalanceAction = async (requestModel: BridgeBalanceRequestModel) => {

    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Content-Type', 'application/json');
    requestHeaders.set('Accept', 'application/json');

    const requestInit: RequestInit = {
        method: 'GET',
        headers: requestHeaders,
    };

    try {
        const response = await fetch(
            `${appSettings.apiUrl}/api/bridgingAddressBalance?chainId=${requestModel.chainId}`,
            requestInit,
        );
        const jsonResponse = await response.json();
        return Number.isInteger(jsonResponse?.message) ? jsonResponse.message : undefined;
    }
    catch (e) {
        console.log('Failed startTxAction: ', e);
    }
}