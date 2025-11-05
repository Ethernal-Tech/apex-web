import { Box, Typography } from '@mui/material';
import TotalBalance from '../components/TotalBalance';
import PasteTextInput from '../components/PasteTextInput';
import PasteApexAmountInput from './PasteApexAmountInput';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	calculateChangeMinUtxo,
	convertApexToDfm,
	convertDfmToWei,
	minBigInt,
} from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
	CardanoTransactionFeeResponseDto,
	ChainEnum,
	CreateEthTransactionResponseDto,
} from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthGas } from '../../../actions/submitTx';
import { isCardanoChain, isEvmChain } from '../../../settings/chain';
import { fetchAndUpdateValidatorStatusAction } from '../../../actions/validatorSetChange';
import InfoBox from './InfoBox';

type BridgeInputType = {
	bridgeTxFee: string;
	getCardanoTxFee: (
		address: string,
		amount: string,
	) => Promise<CardanoTransactionFeeResponseDto>;
	getEthTxFee: (
		address: string,
		amount: string,
	) => Promise<CreateEthTransactionResponseDto>;
	submit: (address: string, amount: string) => Promise<void>;
	loading?: boolean;
};

const calculateMaxAmount = (
	totalDfmBalance: string,
	maxAmountAllowedToBridge: string,
	chain: ChainEnum,
	changeMinUtxo: number,
	minDfmValue: string,
	bridgeTxFee: string,
): { maxByBalance: bigint; maxByAllowed: bigint } => {
	if (!totalDfmBalance || !chain) {
		return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
	}

	const maxAmountAllowedToBridgeDfm =
		BigInt(maxAmountAllowedToBridge || '0') !== BigInt(0)
			? isEvmChain(chain)
				? BigInt(convertDfmToWei(maxAmountAllowedToBridge))
				: BigInt(maxAmountAllowedToBridge)
			: BigInt(0);

	const balanceAllowedToUse =
		maxAmountAllowedToBridgeDfm !== BigInt(0) &&
		BigInt(totalDfmBalance || '0') > maxAmountAllowedToBridgeDfm
			? maxAmountAllowedToBridgeDfm
			: BigInt(totalDfmBalance || '0');

	let maxByBalance;
	if (isEvmChain(chain)) {
		maxByBalance =
			BigInt(totalDfmBalance || '0') -
			BigInt(bridgeTxFee) -
			BigInt(minDfmValue);
	} else {
		maxByBalance =
			BigInt(totalDfmBalance || '0') -
			BigInt(appSettings.potentialWalletFee) -
			BigInt(bridgeTxFee) -
			BigInt(changeMinUtxo);
	}

	return { maxByAllowed: balanceAllowedToUse, maxByBalance };
};

const BridgeInput = ({
	bridgeTxFee,
	getCardanoTxFee,
	getEthTxFee,
	submit,
	loading,
}: BridgeInputType) => {
	const [destinationAddr, setDestinationAddr] = useState('');
	const [amount, setAmount] = useState('');
	const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
	const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();
	const [validatorChangeInProgress, setValidatorChangeInProgress] =
		useState(true);

	const walletUTxOs = useSelector(
		(state: RootState) => state.accountInfo.utxos,
	);
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain } = useSelector((state: RootState) => state.chain);
	const minValueToBridge = useSelector(
		(state: RootState) => state.settings.minValueToBridge,
	);
	const maxAmountAllowedToBridge = useSelector(
		(state: RootState) => state.settings.maxAmountAllowedToBridge,
	);

	const fetchWalletFee = useCallback(async () => {
		if (!destinationAddr || !amount) {
			setUserWalletFee(undefined);
			return;
		}

		try {
			if (isCardanoChain(chain)) {
				const feeResp = await getCardanoTxFee(
					destinationAddr,
					convertApexToDfm(amount || '0', chain),
				);
				setUserWalletFee(BigInt(feeResp?.fee || '0').toString(10));

				return;
			} else if (isEvmChain(chain)) {
				const feeResp = await getEthTxFee(
					destinationAddr,
					convertApexToDfm(amount || '0', chain),
				);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { bridgingFee, isFallback, ...tx } = feeResp;

				const fee = await estimateEthGas(tx, isFallback);
				setUserWalletFee(fee.toString(10));

				return;
			}
		} catch (e) {
			console.log('error while calculating wallet fee', e);
		}

		setUserWalletFee(undefined);
	}, [amount, chain, getEthTxFee, destinationAddr, getCardanoTxFee]);

	useEffect(() => {
		if (fetchCreateTxTimeoutRef.current) {
			clearTimeout(fetchCreateTxTimeoutRef.current);
			fetchCreateTxTimeoutRef.current = undefined;
		}

		fetchCreateTxTimeoutRef.current = setTimeout(fetchWalletFee, 500);

		return () => {
			if (fetchCreateTxTimeoutRef.current) {
				clearTimeout(fetchCreateTxTimeoutRef.current);
				fetchCreateTxTimeoutRef.current = undefined;
			}
		};
	}, [fetchWalletFee]);

	const getValidatorChangeStatus = useCallback(async () => {
		try {
			const isInProgress = await fetchAndUpdateValidatorStatusAction();
			setValidatorChangeInProgress(isInProgress);
		} catch (err) {
			console.error('Failed to fetch validator set change status:', err);
		}
	}, []);

	useEffect(() => {
		getValidatorChangeStatus();

		const intervalId = setInterval(getValidatorChangeStatus, 5000);

		return () => {
			clearInterval(intervalId);
		};
	}, [getValidatorChangeStatus]);

	const onDiscard = () => {
		setDestinationAddr('');
		setAmount('');
	};

	const changeMinUtxo = useMemo(
		() =>
			calculateChangeMinUtxo(
				walletUTxOs,
				+appSettings.minUtxoChainValue[chain],
			),
		[walletUTxOs, chain],
	);

	// either for nexus(wei dfm), or prime&vector (lovelace dfm) units
	const minDfmValue = isEvmChain(chain)
		? convertDfmToWei(minValueToBridge)
		: minValueToBridge;

	const maxAmounts = calculateMaxAmount(
		totalDfmBalance,
		maxAmountAllowedToBridge,
		chain,
		changeMinUtxo,
		minDfmValue,
		bridgeTxFee,
	);
	const maxAmount = minBigInt(
		maxAmounts.maxByAllowed,
		maxAmounts.maxByBalance,
	);

	const onSubmit = useCallback(async () => {
		await submit(destinationAddr, convertApexToDfm(amount || '0', chain));
	}, [amount, destinationAddr, submit, chain]);

	return (
		<Box sx={{ width: '100%' }}>
			<TotalBalance />

			<Typography sx={{ color: 'white', mt: 4, mb: 2 }}>
				Destination Address
			</Typography>
			{/* validate inputs */}
			<PasteTextInput
				sx={{ width: '50%' }}
				text={destinationAddr}
				setText={setDestinationAddr}
				disabled={loading}
				id="dest-addr"
			/>

			<Typography sx={{ color: 'white', mt: 4, mb: 1 }}>
				Enter amount to send
			</Typography>
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2,1fr)',
					gap: '20px',
				}}
			>
				{/* validate inputs */}
				<PasteApexAmountInput
					maxAmounts={maxAmounts}
					text={amount}
					setAmount={setAmount}
					disabled={loading}
					id="bridge-amount"
					sx={{
						gridColumn: 'span 1',
						borderBottom: '2px solid',
						borderImageSource:
							'linear-gradient(180deg, #435F69 10.63%, rgba(67, 95, 105, 0) 130.31%)',
						borderImageSlice: 1,
						paddingBottom: 2,
						paddingTop: 2,
					}}
				/>

				<InfoBox
					userWalletFee={userWalletFee || '0'}
					bridgeTxFee={bridgeTxFee}
					chain={chain}
					sx={{
						gridColumn: 'span 1',
						border: '1px solid #077368',
						borderRadius: '8px',
						padding: 2,
					}}
					isFeeInformation={validatorChangeInProgress}
				/>

				<ButtonCustom
					onClick={onDiscard}
					disabled={loading}
					variant="red"
					sx={{
						gridColumn: 'span 1',
						textTransform: 'uppercase',
					}}
				>
					Discard
				</ButtonCustom>

				<ButtonCustom
					onClick={onSubmit}
					variant="white"
					disabled={
						validatorChangeInProgress ||
						loading ||
						BigInt(maxAmount) <= 0
					}
					sx={{
						gridColumn: 'span 1',
						textTransform: 'uppercase',
					}}
					id="bridge-tx"
				>
					Move funds
				</ButtonCustom>
			</Box>
		</Box>
	);
};

export default BridgeInput;
