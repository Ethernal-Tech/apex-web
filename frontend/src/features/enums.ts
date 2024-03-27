export enum Chain {
    PRIME = 'PRIME',
    VECTOR = 'VECTOR',
}

export enum BridgingRequestState {
    RequestedOnSource = 1,
    RequestedOnDestination = 2,
    Finished = 3,
    Error = 4,
} 