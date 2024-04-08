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
    date: string,
    status: string,
    steps: StepType[]
}
