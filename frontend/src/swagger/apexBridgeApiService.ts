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
    createBridgingTransaction(body: CreateTransactionDto): Promise<CreateTransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/createBridgingTransaction";
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
            return this.processCreateBridgingTransaction(_response);
        });
    }

    protected processCreateBridgingTransaction(response: Response): Promise<CreateTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = CreateTransactionResponseDto.fromJS(resultData200);
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
        return Promise.resolve<CreateTransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    signBridgingTransaction(body: SignTransactionDto): Promise<TransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/signBridgingTransaction";
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
            return this.processSignBridgingTransaction(_response);
        });
    }

    protected processSignBridgingTransaction(response: Response): Promise<TransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = TransactionResponseDto.fromJS(resultData200);
            return result200;
            });
        } else if (status === 400) {
            return response.text().then((_responseText) => {
            return throwException("Not Found", status, _responseText, _headers);
            });
        } else if (status !== 200 && status !== 204) {
            return response.text().then((_responseText) => {
            return throwException("An unexpected server error occurred.", status, _responseText, _headers);
            });
        }
        return Promise.resolve<TransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    submitBridgingTransaction(body: SubmitTransactionDto): Promise<SubmitTransactionResponseDto> {
        let url_ = this.baseUrl + "/transaction/submitBridgingTransaction";
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
            return this.processSubmitBridgingTransaction(_response);
        });
    }

    protected processSubmitBridgingTransaction(response: Response): Promise<SubmitTransactionResponseDto> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            let result200: any = null;
            let resultData200 = _responseText === "" ? null : JSON.parse(_responseText, this.jsonParseReviver);
            result200 = SubmitTransactionResponseDto.fromJS(resultData200);
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
        return Promise.resolve<SubmitTransactionResponseDto>(<any>null);
    }

    /**
     * @return Success
     */
    bridgingTransactionSubmitted(body: TransactionSubmittedDto): Promise<void> {
        let url_ = this.baseUrl + "/transaction/bridgingTransactionSubmitted";
        url_ = url_.replace(/[?&]$/, "");

        const content_ = JSON.stringify(body);

        let options_ = <RequestInit>{
            body: content_,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        };

        return this.transformOptions(options_).then(transformedOptions_ => {
            return this.http.fetch(url_, transformedOptions_);
        }).then((_response: Response) => {
            return this.processBridgingTransactionSubmitted(_response);
        });
    }

    protected processBridgingTransactionSubmitted(response: Response): Promise<void> {
        const status = response.status;
        let _headers: any = {}; if (response.headers && response.headers.forEach) { response.headers.forEach((v: any, k: any) => _headers[k] = v); };
        if (status === 200) {
            return response.text().then((_responseText) => {
            return;
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
        return Promise.resolve<void>(<any>null);
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

export enum ChainEnum {
    Prime = "prime",
    Vector = "vector",
}

export class CreateTransactionReceiverDto implements ICreateTransactionReceiverDto {
    address!: string;
    amount!: number;

    constructor(data?: ICreateTransactionReceiverDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.address = _data["address"];
            this.amount = _data["amount"];
        }
    }

    static fromJS(data: any): CreateTransactionReceiverDto {
        data = typeof data === 'object' ? data : {};
        let result = new CreateTransactionReceiverDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["address"] = this.address;
        data["amount"] = this.amount;
        return data; 
    }
}

export interface ICreateTransactionReceiverDto {
    address: string;
    amount: number;
}

export class CreateTransactionDto implements ICreateTransactionDto {
    senderAddress!: string;
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    receivers!: CreateTransactionReceiverDto[];
    bridgingFee!: number | undefined;

    constructor(data?: ICreateTransactionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
        if (!data) {
            this.receivers = [];
        }
    }

    init(_data?: any) {
        if (_data) {
            this.senderAddress = _data["senderAddress"];
            this.originChain = _data["originChain"];
            this.destinationChain = _data["destinationChain"];
            if (Array.isArray(_data["receivers"])) {
                this.receivers = [] as any;
                for (let item of _data["receivers"])
                    this.receivers!.push(CreateTransactionReceiverDto.fromJS(item));
            }
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
        if (Array.isArray(this.receivers)) {
            data["receivers"] = [];
            for (let item of this.receivers)
                data["receivers"].push(item.toJSON());
        }
        data["bridgingFee"] = this.bridgingFee;
        return data; 
    }
}

export interface ICreateTransactionDto {
    senderAddress: string;
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    receivers: CreateTransactionReceiverDto[];
    bridgingFee: number | undefined;
}

export class CreateTransactionResponseDto implements ICreateTransactionResponseDto {
    txRaw!: string;
    txHash!: string;
    bridgingFee!: number;

    constructor(data?: ICreateTransactionResponseDto) {
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
        }
    }

    static fromJS(data: any): CreateTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new CreateTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["txRaw"] = this.txRaw;
        data["txHash"] = this.txHash;
        data["bridgingFee"] = this.bridgingFee;
        return data; 
    }
}

export interface ICreateTransactionResponseDto {
    txRaw: string;
    txHash: string;
    bridgingFee: number;
}

export class SignTransactionDto implements ISignTransactionDto {
    signingKeyHex!: string;
    txRaw!: string;
    txHash!: string;

    constructor(data?: ISignTransactionDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.signingKeyHex = _data["signingKeyHex"];
            this.txRaw = _data["txRaw"];
            this.txHash = _data["txHash"];
        }
    }

    static fromJS(data: any): SignTransactionDto {
        data = typeof data === 'object' ? data : {};
        let result = new SignTransactionDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["signingKeyHex"] = this.signingKeyHex;
        data["txRaw"] = this.txRaw;
        data["txHash"] = this.txHash;
        return data; 
    }
}

export interface ISignTransactionDto {
    signingKeyHex: string;
    txRaw: string;
    txHash: string;
}

export class TransactionResponseDto implements ITransactionResponseDto {
    txRaw!: string;
    txHash!: string;

    constructor(data?: ITransactionResponseDto) {
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
        }
    }

    static fromJS(data: any): TransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new TransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["txRaw"] = this.txRaw;
        data["txHash"] = this.txHash;
        return data; 
    }
}

export interface ITransactionResponseDto {
    txRaw: string;
    txHash: string;
}

export class SubmitTransactionDto implements ISubmitTransactionDto {
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    originTxHash!: string;
    senderAddress!: string;
    receiverAddrs!: string[];
    amount!: number;
    signedTxRaw!: string;

    constructor(data?: ISubmitTransactionDto) {
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
            this.signedTxRaw = _data["signedTxRaw"];
        }
    }

    static fromJS(data: any): SubmitTransactionDto {
        data = typeof data === 'object' ? data : {};
        let result = new SubmitTransactionDto();
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
        data["signedTxRaw"] = this.signedTxRaw;
        return data; 
    }
}

export interface ISubmitTransactionDto {
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    originTxHash: string;
    senderAddress: string;
    receiverAddrs: string[];
    amount: number;
    signedTxRaw: string;
}

export class SubmitTransactionResponseDto implements ISubmitTransactionResponseDto {
    txId!: string;

    constructor(data?: ISubmitTransactionResponseDto) {
        if (data) {
            for (var property in data) {
                if (data.hasOwnProperty(property))
                    (<any>this)[property] = (<any>data)[property];
            }
        }
    }

    init(_data?: any) {
        if (_data) {
            this.txId = _data["txId"];
        }
    }

    static fromJS(data: any): SubmitTransactionResponseDto {
        data = typeof data === 'object' ? data : {};
        let result = new SubmitTransactionResponseDto();
        result.init(data);
        return result;
    }

    toJSON(data?: any) {
        data = typeof data === 'object' ? data : {};
        data["txId"] = this.txId;
        return data; 
    }
}

export interface ISubmitTransactionResponseDto {
    txId: string;
}

export class TransactionSubmittedDto implements ITransactionSubmittedDto {
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
    originTxHash!: string;
    senderAddress!: string;
    receiverAddrs!: string[];
    amount!: number;

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
        return data; 
    }
}

export interface ITransactionSubmittedDto {
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    originTxHash: string;
    senderAddress: string;
    receiverAddrs: string[];
    amount: number;
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
    amount!: number;
    originChain!: ChainEnum;
    destinationChain!: ChainEnum;
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
    amount: number;
    originChain: ChainEnum;
    destinationChain: ChainEnum;
    status: TransactionStatusEnum;
    createdAt: Date;
    finishedAt?: Date | undefined;
}

export class BridgeTransactionFilterDto implements IBridgeTransactionFilterDto {
    page?: number | undefined;
    perPage?: number | undefined;
    senderAddress!: string;
    originChain!: ChainEnum;
    destinationChain?: ChainEnum | undefined;
    amountFrom?: number | undefined;
    amountTo?: number | undefined;
    orderBy?: string | undefined;
    order?: string | undefined;

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
        return data; 
    }
}

export interface IBridgeTransactionFilterDto {
    page?: number | undefined;
    perPage?: number | undefined;
    senderAddress: string;
    originChain: ChainEnum;
    destinationChain?: ChainEnum | undefined;
    amountFrom?: number | undefined;
    amountTo?: number | undefined;
    orderBy?: string | undefined;
    order?: string | undefined;
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