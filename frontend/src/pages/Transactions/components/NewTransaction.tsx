import React from 'react';
import { Box, Typography } from '@mui/material';

type NewTransactionProps = {
	txInProgress?: boolean;
	children: React.ReactNode;
};

function NewTransaction({ children }: NewTransactionProps) {
	return (
		<Box
			border="1px solid #372B2B"
			borderRadius={5}
			px={4}
			py={4}
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

			<Box>{children}</Box>
		</Box>
	);
}

export default NewTransaction;
