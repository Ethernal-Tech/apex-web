import { Box, Typography } from '@mui/material';
// import AddressBalance from './AddressBalance';
// import TotalBalance from './TotalBalance';
// import { useSelector } from 'react-redux';
// import { RootState } from '../../../redux/store';
import React from 'react';
// import { ChainEnum } from '../../../swagger/apexBridgeApiService';
// import ReputationSystemWidget from '../RepSystem/ReputationSystemWidget';
// import { getChainInfo } from '../../../settings/chain';

// const tabletMediaQuery = '@media (max-width:800px)';

type NewTransactionProps = {
	txInProgress?: boolean;
	children: React.ReactNode;
};

function NewTransaction({ children }: NewTransactionProps) {
	// const chain = useSelector((state: RootState) => state.chain.chain);
	// const destinationChain = useSelector(
	// 	(state: RootState) => state.chain.destinationChain,
	// );
	// const SourceIcon = getChainInfo(chain).icon;
	// const DestinationIcon = getChainInfo(destinationChain).icon;
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="space-between"
			border="1px solid #372B2B"
			borderRadius={5}
			px={8}
			py={4}
			mt={10}
			sx={{
				backdropFilter: 'blur(14px)',
				maxWidth: '470px',
				width: '100%',
			}}
		>
			<Typography
				mb={'7px'}
				fontWeight={600}
				sx={{ color: '#fff', fontSize: '18px', textAlign: 'center' }}
			>
				Bridge your tokens
			</Typography>
			<Box
				p={4}
				mt={2}
				borderRadius={5}
				display="flex"
				flexDirection="column"
				sx={{
					backgroundColor: '#242625',
					minWidth: '100%',
				}}
			>
				{children}
			</Box>
		</Box>
	);
}

export default NewTransaction;
