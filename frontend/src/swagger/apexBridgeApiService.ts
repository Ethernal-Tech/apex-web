/* tslint:disable */
/* eslint-disable */
//----------------------
// <auto-generated>
//     Generated using the NSwag toolchain v13.10.9.0 (NJsonSchema v10.4.1.0 (Newtonsoft.Json v11.0.0.0)) (http://NSwag.org)
// </auto-generated>
//----------------------
// ReSharper disable InconsistentNaming

import { BaseClient } from './BaseClient';

export class TransactionControllerClient extends BaseClient {
    private http: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> };
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(baseUrl?: string, http?: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> }) {
        super();
        this.http = http ? http : <any>window;
        this.baseUrl = this.getBaseUrl("", baseUrl);
    }

    /**
     * @return Success
     */
    createCardano(body: CreateTransactionDto): Promise<CreateCardanoTransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/createCardano";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processCreateCardano(_response);
        });
    }

    protected processCreateCardano(response: Response): Promise<CreateCardanoTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = CreateCardanoTransactionResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 400) {
            return response.text().then((_responseText) => {
            return throwException("Bad Request", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<CreateCardanoTransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    submitCardano(body: SubmitCardanoTransactionDto): Promise<SubmitCardanoTransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/submitCardano";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processSubmitCardano(_response);
        });
    }

    protected processSubmitCardano(response: Response): Promise<SubmitCardanoTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = SubmitCardanoTransactionResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 400) {
            return response.text().then((_responseText) => {
            return throwException("Bad Request", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<SubmitCardanoTransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    createEth(body: CreateTransactionDto): Promise<CreateEthTransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/createEth";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processCreateEth(_response);
        });
    }

    protected processCreateEth(response: Response): Promise<CreateEthTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = CreateEthTransactionResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 400) {
            return response.text().then((_responseText) => {
            return throwException("Bad Request", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<CreateEthTransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    bridgingTransactionSubmitted(body: TransactionSubmittedDto): Promise<BridgeTransactionDto> {
        let url_ = this.baseUrl + "/transaction/bridgingTransactionSubmitted";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processBridgingTransactionSubmitted(_response);
        });
    }

    protected processBridgingTransactionSubmitted(response: Response): Promise<BridgeTransactionDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = BridgeTransactionDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 400) {
            return response.text().then((_responseText) => {
            return throwException("Bad Request", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<BridgeTransactionDto>(<any>null);
    }
}

export class BridgeTransactionControllerClient extends BaseClient {
    private http: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> };
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(baseUrl?: string, http?: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> }) {
        super();
        this.http = http ? http : <any>window;
        this.baseUrl = this.getBaseUrl("", baseUrl);
    }

    /**
     * @return Success
     */
    get(id: number): Promise<BridgeTransactionDto> {
        let url_ = this.baseUrl + "/bridgeTransaction/{id}";
        if (id === undefined || id === null)
            throw new Error("The parameter 'id' must be defined.");
        url_ = url_.replace("{id}", encodeURIComponent("" + id));
        url_ = url_.replace(/[?&]$/, "");

        let options_ = <RequestInit>{
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processGet(_response);
        });
    }

    protected processGet(response: Response): Promise<BridgeTransactionDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = BridgeTransactionDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 404) {
            return response.text().then((_responseText) => {
            return throwException("Not Found", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<BridgeTransactionDto>(<any>null);
    }

    /**
     * @return Success
     */
    getAllFiltered(body: BridgeTransactionFilterDto): Promise<BridgeTransactionResponseDto> {
        let url_ = this.baseUrl + "/bridgeTransaction/filter";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processGetAllFiltered(_response);
        });
    }

    protected processGetAllFiltered(response: Response): Promise<BridgeTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = BridgeTransactionResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<BridgeTransactionResponseDto>(<any>null);
    }
}

export class WalletControllerClient extends BaseClient {
    private http: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> };
    private baseUrl: string;
    protected jsonParseReviver: ((key: string, value: any) => any) | undefined = undefined;

    constructor(baseUrl?: string, http?: { fetch(url: RequestInfo, init?: RequestInit): Promise<Response> }) {
        super();
        this.http = http ? http : <any>window;
        this.baseUrl = this.getBaseUrl("", baseUrl);
    }

    /**
     * @return Success
     */
    getBalance(chain: string, address: string): Promise<BalanceResponseDto> {
        let url_ = this.baseUrl + "/wallet/getBalance?";
        if (chain === undefined || chain === null)
            throw new Error("The parameter 'chain' must be defined and cannot be null.");
        else
            url_ += "chain=" + encodeURIComponent("" + chain) + "&";
        if (address === undefined || address === null)
            throw new Error("The parameter 'address' must be defined and cannot be null.");
        else
            url_ += "address=" + encodeURIComponent("" + address) + "&";
        url_ = url_.replace(/[?&]$/, "");

        let options_ = <RequestInit>{
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processGetBalance(_response);
        });
    }

    protected processGetBalance(response: Response): Promise<BalanceResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = BalanceResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 404) {
            return response.text().then((_responseText) => {
            return throwException("Not Found", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<BalanceResponseDto>(<any>null);
    }
}

export enum ChainEnum {
    Prime = "prime",
    Vector = "vector",
    Nexus = "nexus",
}

export class CreateTransactionDto implements ICreateTransactionDto {
    senderAddress!: string;
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    destinationAddress!: string;
    amount!: string;
    bridgingFee!: string | undefined;

    constructor(data?: ICreateTransactionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.senderAddress = _data["senderAddress"];
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            this.destinationAddress = _data["destinationAddress"];
            this.amount = _data["amount"];
            this.bridgingFee = _data["bridgingFee"];
        }
    }

    static fromJS(data: any): CreateTransactionDto {
        data = typeof data === 'object' ? data : {};
        let result = new CreateTransactionDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["senderAddress"] = this.senderAddress;
        data["originChain"] = this.originChain;
        data["destinationChain"] = this.destinationChain;
        data["destinationAddress"] = this.destinationAddress;
        data["amount"] = this.amount;
        data["bridgingFee"] = this.bridgingFee;
        return data; 
    }
}

export interface ICreateTransactionDto {
    senderAddress: string;
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    destinationAddress: string;
    amount: string;
    bridgingFee: string | undefined;
}

export class CreateCardanoTransactionResponseDto implements ICreateCardanoTransactionResponseDto {
    txRaw!: string;
    txHash!: string;
    bridgingFee!: number;
    txFee!: number;
    isCentralized!: boolean;

    constructor(data?: ICreateCardanoTransactionResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.txRaw = _data["txRaw"];
            this.txHash = _data["txHash"];
            this.bridgingFee = _data["bridgingFee"];
            this.txFee = _data["txFee"];
            this.isCentralized = _data["isCentralized"];
        }
    }

    static fromJS(data: any): CreateCardanoTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new CreateCardanoTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["txRaw"] = this.txRaw;
        data["txHash"] = this.txHash;
        data["bridgingFee"] = this.bridgingFee;
        data["txFee"] = this.txFee;
        data["isCentralized"] = this.isCentralized;
        return data; 
    }
}

export interface ICreateCardanoTransactionResponseDto {
    txRaw: string;
    txHash: string;
    bridgingFee: number;
    txFee: number;
    isCentralized: boolean;
}

export class SubmitCardanoTransactionDto implements ISubmitCardanoTransactionDto {
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    originTxHash!: string;
    senderAddress!: string;
    receiverAddrs!: string[];
    amount!: string;
    isCentralized!: boolean;
    signedTxRaw!: string;

    constructor(data?: ISubmitCardanoTransactionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
        if (!data) {
            this.receiverAddrs = [];
        }
    }

    init(_data?: any) {
        if (_data) {
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            this.originTxHash = _data["originTxHash"];
            this.senderAddress = _data["senderAddress"];
            if (Array.isArray(_data["receiverAddrs"])) {
                this.receiverAddrs = [] as any;
                for (let item of _data["receiverAddrs"])
                    this.receiverAddrs!.push(item);
            }
            this.amount = _data["amount"];
            this.isCentralized = _data["isCentralized"];
            this.signedTxRaw = _data["signedTxRaw"];
        }
    }

    static fromJS(data: any): SubmitCardanoTransactionDto {
        data = typeof data === 'object' ? data : {};
        let result = new SubmitCardanoTransactionDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["originChain"] = this.originChain;
        data["destinationChain"] = this.destinationChain;
        data["originTxHash"] = this.originTxHash;
        data["senderAddress"] = this.senderAddress;
        if (Array.isArray(this.receiverAddrs)) {
            data["receiverAddrs"] = [];
            for (let item of this.receiverAddrs)
                data["receiverAddrs"].push(item);
        }
        data["amount"] = this.amount;
        data["isCentralized"] = this.isCentralized;
        data["signedTxRaw"] = this.signedTxRaw;
        return data; 
    }
}

export interface ISubmitCardanoTransactionDto {
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    originTxHash: string;
    senderAddress: string;
    receiverAddrs: string[];
    amount: string;
    isCentralized: boolean;
    signedTxRaw: string;
}

export enum TransactionStatusEnum {
    Pending = "Pending",
    DiscoveredOnSource = "DiscoveredOnSource",
    InvalidRequest = "InvalidRequest",
    SubmittedToBridge = "SubmittedToBridge",
    IncludedInBatch = "IncludedInBatch",
    SubmittedToDestination = "SubmittedToDestination",
    FailedToExecuteOnDestination = "FailedToExecuteOnDestination",
    ExecutedOnDestination = "ExecutedOnDestination",
}

export class BridgeTransactionDto implements IBridgeTransactionDto {
    id!: number;
    senderAddress!: string;
    receiverAddresses!: string;
    amount!: string;
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    sourceTxHash!: string;
    destinationTxHash?: string | undefined;
    status!: TransactionStatusEnum;
    createdAt!: Date;
    finishedAt?: Date | undefined;

    constructor(data?: IBridgeTransactionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.id = _data["id"];
            this.senderAddress = _data["senderAddress"];
            this.receiverAddresses = _data["receiverAddresses"];
            this.amount = _data["amount"];
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            this.sourceTxHash = _data["sourceTxHash"];
            this.destinationTxHash = _data["destinationTxHash"];
            this.status = _data["status"];
            this.createdAt = _data["createdAt"] ? new Date(_data["createdAt"].toString()) : <any>undefined;
            this.finishedAt = _data["finishedAt"] ? new Date(_data["finishedAt"].toString()) : <any>undefined;
        }
    }

    static fromJS(data: any): BridgeTransactionDto {
        data = typeof data === 'object' ? data : {};
        let result = new BridgeTransactionDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["id"] = this.id;
        data["senderAddress"] = this.senderAddress;
        data["receiverAddresses"] = this.receiverAddresses;
        data["amount"] = this.amount;
        data["originChain"] = this.originChain;
        data["destinationChain"] = this.destinationChain;
        data["sourceTxHash"] = this.sourceTxHash;
        data["destinationTxHash"] = this.destinationTxHash;
        data["status"] = this.status;
        data["createdAt"] = this.createdAt ? this.createdAt.toISOString() : <any>undefined;
        data["finishedAt"] = this.finishedAt ? this.finishedAt.toISOString() : <any>undefined;
        return data; 
    }
}

export interface IBridgeTransactionDto {
    id: number;
    senderAddress: string;
    receiverAddresses: string;
    amount: string;
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    sourceTxHash: string;
    destinationTxHash?: string | undefined;
    status: TransactionStatusEnum;
    createdAt: Date;
    finishedAt?: Date | undefined;
}

export class SubmitCardanoTransactionResponseDto implements ISubmitCardanoTransactionResponseDto {
    txHash!: string;
    bridgeTx!: BridgeTransactionDto | undefined;

    constructor(data?: ISubmitCardanoTransactionResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.txHash = _data["txHash"];
            this.bridgeTx = _data["bridgeTx"] ? BridgeTransactionDto.fromJS(_data["bridgeTx"]) : <any>undefined;
        }
    }

    static fromJS(data: any): SubmitCardanoTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new SubmitCardanoTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["txHash"] = this.txHash;
        data["bridgeTx"] = this.bridgeTx ? this.bridgeTx.toJSON() : <any>undefined;
        return data; 
    }
}

export interface ISubmitCardanoTransactionResponseDto {
    txHash: string;
    bridgeTx: BridgeTransactionDto | undefined;
}

export class CreateEthTransactionResponseDto implements ICreateEthTransactionResponseDto {
    from!: string;
    to!: string;
    value?: string | undefined;
    data!: string;
    bridgingFee!: string;
    isCentralized!: boolean;

    constructor(data?: ICreateEthTransactionResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.from = _data["from"];
            this.to = _data["to"];
            this.value = _data["value"];
            this.data = _data["data"];
            this.bridgingFee = _data["bridgingFee"];
            this.isCentralized = _data["isCentralized"];
        }
    }

    static fromJS(data: any): CreateEthTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new CreateEthTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["from"] = this.from;
        data["to"] = this.to;
        data["value"] = this.value;
        data["data"] = this.data;
        data["bridgingFee"] = this.bridgingFee;
        data["isCentralized"] = this.isCentralized;
        return data; 
    }
}

export interface ICreateEthTransactionResponseDto {
    from: string;
    to: string;
    value?: string | undefined;
    data: string;
    bridgingFee: string;
    isCentralized: boolean;
}

export class TransactionSubmittedDto implements ITransactionSubmittedDto {
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    originTxHash!: string;
    senderAddress!: string;
    receiverAddrs!: string[];
    amount!: string;
    isCentralized!: boolean;

    constructor(data?: ITransactionSubmittedDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
        if (!data) {
            this.receiverAddrs = [];
        }
    }

    init(_data?: any) {
        if (_data) {
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            this.originTxHash = _data["originTxHash"];
            this.senderAddress = _data["senderAddress"];
            if (Array.isArray(_data["receiverAddrs"])) {
                this.receiverAddrs = [] as any;
                for (let item of _data["receiverAddrs"])
                    this.receiverAddrs!.push(item);
            }
            this.amount = _data["amount"];
            this.isCentralized = _data["isCentralized"];
        }
    }

    static fromJS(data: any): TransactionSubmittedDto {
        data = typeof data === 'object' ? data : {};
        let result = new TransactionSubmittedDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["originChain"] = this.originChain;
        data["destinationChain"] = this.destinationChain;
        data["originTxHash"] = this.originTxHash;
        data["senderAddress"] = this.senderAddress;
        if (Array.isArray(this.receiverAddrs)) {
            data["receiverAddrs"] = [];
            for (let item of this.receiverAddrs)
                data["receiverAddrs"].push(item);
        }
        data["amount"] = this.amount;
        data["isCentralized"] = this.isCentralized;
        return data; 
    }
}

export interface ITransactionSubmittedDto {
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    originTxHash: string;
    senderAddress: string;
    receiverAddrs: string[];
    amount: string;
    isCentralized: boolean;
}

export class BridgeTransactionFilterDto implements IBridgeTransactionFilterDto {
    page?: number | undefined;
    perPage?: number | undefined;
    senderAddress!: string;
    originChain!: ChainEnum;
    destinationChain?: ChainEnum | undefined;
    amountFrom?: string | undefined;
    amountTo?: string | undefined;
    orderBy?: string | undefined;
    order?: string | undefined;
    receiverAddress?: string | undefined;

    constructor(data?: IBridgeTransactionFilterDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.page = _data["page"];
            this.perPage = _data["perPage"];
            this.senderAddress = _data["senderAddress"];
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            this.amountFrom = _data["amountFrom"];
            this.amountTo = _data["amountTo"];
            this.orderBy = _data["orderBy"];
            this.order = _data["order"];
            this.receiverAddress = _data["receiverAddress"];
        }
    }

    static fromJS(data: any): BridgeTransactionFilterDto {
        data = typeof data === 'object' ? data : {};
        let result = new BridgeTransactionFilterDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["page"] = this.page;
        data["perPage"] = this.perPage;
        data["senderAddress"] = this.senderAddress;
        data["originChain"] = this.originChain;
        data["destinationChain"] = this.destinationChain;
        data["amountFrom"] = this.amountFrom;
        data["amountTo"] = this.amountTo;
        data["orderBy"] = this.orderBy;
        data["order"] = this.order;
        data["receiverAddress"] = this.receiverAddress;
        return data; 
    }
}

export interface IBridgeTransactionFilterDto {
    page?: number | undefined;
    perPage?: number | undefined;
    senderAddress: string;
    originChain: ChainEnum;
    destinationChain?: ChainEnum | undefined;
    amountFrom?: string | undefined;
    amountTo?: string | undefined;
    orderBy?: string | undefined;
    order?: string | undefined;
    receiverAddress?: string | undefined;
}

export class BridgeTransactionResponseDto implements IBridgeTransactionResponseDto {
    items!: BridgeTransactionDto[];
    page!: number;
    perPage!: number;
    total!: number;

    constructor(data?: IBridgeTransactionResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
        if (!data) {
            this.items = [];
        }
    }

    init(_data?: any) {
        if (_data) {
            if (Array.isArray(_data["items"])) {
                this.items = [] as any;
                for (let item of _data["items"])
                    this.items!.push(BridgeTransactionDto.fromJS(item));
            }
            this.page = _data["page"];
            this.perPage = _data["perPage"];
            this.total = _data["total"];
        }
    }

    static fromJS(data: any): BridgeTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new BridgeTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        if (Array.isArray(this.items)) {
            data["items"] = [];
            for (let item of this.items)
                data["items"].push(item.toJSON());
        }
        data["page"] = this.page;
        data["perPage"] = this.perPage;
        data["total"] = this.total;
        return data; 
    }
}

export interface IBridgeTransactionResponseDto {
    items: BridgeTransactionDto[];
    page: number;
    perPage: number;
    total: number;
}

export class BalanceResponseDto implements IBalanceResponseDto {
    balance!: string;

    constructor(data?: IBalanceResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.balance = _data["balance"];
        }
    }

    static fromJS(data: any): BalanceResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new BalanceResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["balance"] = this.balance;
        return data; 
    }
}

export interface IBalanceResponseDto {
    balance: string;
}

export class ApiException extends Error {
    message: string;
    status: number;
    response: string;
    headers: { [key: string]: any; };
    result: any;

    constructor(message: string, status: number, response: string, headers: { [key: string]: any; }, result: any) {
        super();

        this.message = message;
        this.status = status;
        this.response = response;
        this.headers = headers;
        this.result = result;
    }

    protected isApiException = true;

    static isApiException(obj: any): obj is ApiException {
        return obj.isApiException === true;
    }
}

function throwException(message: string, status: number, response: string, headers: { [key: string]: any; }, result?: any): any {
    throw new ApiException(message, status, response, headers, result);
}