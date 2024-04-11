interface HeadCell {
    id: string;
    label: string;
}

export const headCells: readonly HeadCell[] = [
    {
        id: 'originChain',
        label: 'Origin Chain',
    },
    {
        id: 'destinationChain',
        label: 'Destination Chain',
    },
    {
        id: 'amount',
        label: 'Amount',
    },
    {
        id: 'receiverAddress',
        label: 'Receiver Address',
    },
    {
        id: 'createdAt',
        label: 'Created At',
    },
    {
        id: 'finishedAt',
        label: 'Finished At',
    },
    {
        id: 'status',
        label: 'Status',
    },
    {
        id: 'actions',
        label: 'Actions',
    },
];
