import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useMemo, useState } from 'react';
import BasePage from '../base/BasePage';
import { TRANSACTIONS_ROUTE } from '../PageRouter';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../../utils/fetchUtils';
import { formatTxDetailUrl } from '../../utils/generalUtils';
import { getExplorerTxUrl } from '../../utils/chainUtils';
import { loadPendingTx, removePendingTx } from '../../utils/pendingTx';
import { getByTxHashAction } from './action';
import TransferProgress from './components/TransferProgress';
import NewTransaction from './components/NewTransaction';

const POLL_INTERVAL_MS = 2000;
// after this long the page tells the user that recording takes longer than usual
const SLOW_AFTER_MS = 5 * 60 * 1000;

// hex hash (cardano, evm)
const TX_HASH_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;

const chainValues = new Set<string>(Object.values(ChainEnum));

/**
 * Shows a bridging tx submitted to the source chain before web-api records it.
 * The page polls web-api by source chain and tx hash, and switches to the
 * regular transaction page once the tx is recorded.
 */
const PendingTransactionPage = () => {
	const { originChain = '', txHash = '' } = useParams<{
		originChain: string;
		txHash: string;
	}>();
	const navigate = useNavigate();

	const isValid = chainValues.has(originChain) && TX_HASH_REGEX.test(txHash);

	// present only in the tab that submitted the tx
	const pendingTx = useMemo(
		() => (isValid ? loadPendingTx(originChain, txHash) : undefined),
		[isValid, originChain, txHash],
	);

	const [openedAt] = useState(() => Date.now());
	const startedAt = pendingTx?.createdAt.getTime() ?? openedAt;
	const [isSlow, setIsSlow] = useState(
		() => Date.now() - startedAt >= SLOW_AFTER_MS,
	);

	useEffect(() => {
		const remaining = SLOW_AFTER_MS - (Date.now() - startedAt);
		if (remaining <= 0) {
			setIsSlow(true);
			return;
		}

		const timeout = setTimeout(() => setIsSlow(true), remaining);
		return () => clearTimeout(timeout);
	}, [startedAt]);

	useEffect(() => {
		if (!isValid) {
			return;
		}

		let cancelled = false;

		const poll = async () => {
			const response = await tryCatchJsonByAction(
				getByTxHashAction.bind(null, originChain, txHash),
				false,
			);
			if (cancelled || !response || response instanceof ErrorResponse) {
				return;
			}

			cancelled = true;
			removePendingTx(originChain, txHash);
			navigate(formatTxDetailUrl(response), { replace: true });
		};

		poll();
		const handle = setInterval(poll, POLL_INTERVAL_MS);

		return () => {
			cancelled = true;
			clearInterval(handle);
		};
	}, [isValid, originChain, txHash, navigate]);

	const explorerUrl = isValid
		? getExplorerTxUrl(originChain as ChainEnum, txHash)
		: undefined;

	return (
		<BasePage>
			<Box
				sx={{
					mb: 2,
					display: 'flex',
					alignSelf: 'start',
					color: 'white',
				}}
			>
				<Link
					component={RouterLink}
					to={TRANSACTIONS_ROUTE}
					sx={{
						mr: 1,
						color: 'inherit',
						textDecoration: 'none',
						display: 'flex',
						justifyContent: 'center',
						gap: 2,
					}}
				>
					<Typography variant="body1">
						<ArrowBackIcon />
					</Typography>
					<Typography variant="body1">
						Back to transactions
					</Typography>
				</Link>
			</Box>

			{isSlow && (
				<Box sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
					<Typography variant="body2">
						This is taking longer than usual. The transaction will
						be tracked once it is confirmed on the source chain.
					</Typography>
					{explorerUrl && <ExplorerLink url={explorerUrl} />}
				</Box>
			)}

			{!isValid && (
				<Box sx={{ color: 'white', textAlign: 'center', mt: 4 }}>
					<Typography variant="body1">
						Transaction wasn&apos;t found
					</Typography>
					<Typography variant="body2">
						The link doesn&apos;t point to a valid bridging
						transaction.
					</Typography>
				</Box>
			)}

			{isValid && pendingTx && (
				<NewTransaction txInProgress={true}>
					<TransferProgress tx={pendingTx} />
				</NewTransaction>
			)}

			{isValid && !pendingTx && (
				<Box
					sx={{
						color: 'white',
						textAlign: 'center',
						mt: 4,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 1,
					}}
				>
					<CircularProgress color="inherit" />
					<Typography variant="body1">
						Waiting for the transaction to be recorded
					</Typography>
					<Typography
						variant="body2"
						sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}
					>
						{txHash}
					</Typography>
					{!isSlow && explorerUrl && (
						<ExplorerLink url={explorerUrl} />
					)}
				</Box>
			)}
		</BasePage>
	);
};

const ExplorerLink = ({ url }: { url: string }) => (
	<Link
		href={url}
		target="_blank"
		rel="noreferrer"
		sx={{ color: 'inherit', textDecoration: 'underline' }}
	>
		View in explorer
	</Link>
);

export default PendingTransactionPage;
