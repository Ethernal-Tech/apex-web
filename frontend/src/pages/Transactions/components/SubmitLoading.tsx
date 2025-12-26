import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { SubmitLoadingState } from '../../../utils/statusUtils';
import { getExplorerTxUrl } from '../../../utils/chainUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import LaunchIcon from '@mui/icons-material/Launch';

export type SubmitLoadingType = {
	loadingState: SubmitLoadingState | undefined;
};

const SubmitLoading = ({ loadingState }: SubmitLoadingType) => {
	const { chain } = useSelector((state: RootState) => state.chain);
	return (
		<>
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'flex-start',
					alignItems: 'center',
				}}
			>
				<CircularProgress
					size={30}
					sx={{
						color: 'white',
						mr: 3,
					}}
				/>
				<Typography sx={{ color: 'white' }} fontSize={20}>
					{loadingState?.content}
					{!!loadingState?.txHash &&
						getExplorerTxUrl(chain, loadingState.txHash) && (
							<>
								&nbsp;
								<Link
									href={getExplorerTxUrl(
										chain,
										loadingState.txHash,
									)}
									target="_blank"
									rel="noreferrer"
								>
									<LaunchIcon
										sx={{
											marginLeft: '6px',
											fontSize: '20px',
											color: 'white',
										}}
									/>
								</Link>
							</>
						)}
				</Typography>
			</Box>
			<Typography sx={{ color: 'white', mt: 2, fontSize: '13px' }}>
				Please do not leave this page during this process.
			</Typography>
		</>
	);
};

export default SubmitLoading;
