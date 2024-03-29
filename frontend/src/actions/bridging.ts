import appSettings from '../settings/appSettings';

export type StartTxRequestModel = {
    priv_key: string,
    sender_address: string,
    amount: number,
    chainId: string,
    recv_address: string,
}

export const requestBridgingAction = async (requestModel: StartTxRequestModel) => {

    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Content-Type', 'application/json');
    requestHeaders.set('Accept', 'application/json');

    const requestInit: RequestInit = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestModel)
    };

    try {
        const response = await fetch(`${appSettings.apiUrl}/api/createAndSignBridgingTx`, requestInit);
        return await response.json();
    }
    catch (e) {
        console.log('Failed startTxAction: ', e);
    }
}