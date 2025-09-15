import { Box, CircularProgress } from '@mui/material';

const FullPageSpinner = () => {
	return (
		<Box
			sx={{
				position: 'absolute',
				top: 64,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: (theme) =>
					theme.palette.mode === 'light'
						? 'rgba(255, 255, 255, 0.5)'
						: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backdropFilter: 'blur(4px)',
				zIndex: 10,
			}}
		>
			<Box>
				<CircularProgress size={100} />
			</Box>
		</Box>
	);
};

export default FullPageSpinner;
