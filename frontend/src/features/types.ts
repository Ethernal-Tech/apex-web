export type StepType = {
    label: string,
    status: 'success' | 'pending' | 'rejected',
    active: boolean
}

export type BridgeTransactionType = {
    id: string,
    originChain: string,
    destinationChain: string,
    amount: string,
    status: string,
    senderAddress: string;
    receiverAddress: string;
    createdAt: string;
    finishedAt: string | null;
    steps: StepType[]
}
