import { Box, SelectChangeEvent, Typography } from '@mui/material';
import PasteTextInput from '../components/PasteTextInput';
import PasteApexAmountInput from './PasteApexAmountInput';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { convertApexToDfm } from '../../../utils/generalUtils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { TxTypeEnum } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import { useSupportedSourceTokenOptions } from '../utils';
import { BridgingModeEnum } from '../../../settings/chain';
import { getCurrencyID, getTokenInfo } from '../../../settings/token';
import FeeInformation from './FeeInformation';
import {
	estimateEthTxFee,
	getLayerZeroTransferResponse,
} from '../../../actions/submitTx';
import SubmitLoading from './SubmitLoading';
import { SubmitLoadingState } from '../../../utils/statusUtils';
import { captureException } from '../../../features/sentry';
import { setNewTxSourceTokenIDAction } from '../../../redux/slices/newTxSlice';

type BridgeInputType = {
	submit: (address: string, amount: string, tokenID: number) => Promise<void>;
	loadingState: SubmitLoadingState | undefined;
};

const calculateMaxAmountToken = (
	totalDfmBalance: { [key: string]: string },
	sourceTokenID: number | undefined,
	currencyID: number | undefined,
): bigint => {
	if (
		!totalDfmBalance ||
		!sourceTokenID ||
		!currencyID ||
		sourceTokenID === currencyID
	) {
		return BigInt(0);
	}

	return BigInt(totalDfmBalance[sourceTokenID] || '0');
};

const calculateMaxAmountCurrency = (
	totalDfmBalance: { [key: string]: string },
	sourceTokenID: number | undefined,
	currencyID: number | undefined,
	bridgeTxFee: string,
	userWalletFee: string,
): bigint => {
	if (!totalDfmBalance || !sourceTokenID || !currencyID) {
		return BigInt(0);
	}

	const balance = BigInt(totalDfmBalance[currencyID] || '0');
	// If sending the chain currency (native token), the sender must also cover:
	// - `bridgeTxFee` (LayerZero msg.value portion beyond the sent amount)
	// - `userWalletFee` (estimated gas/network fee for submitting the transaction)
	if (sourceTokenID === currencyID) {
		return (
			balance - BigInt(bridgeTxFee || '0') - BigInt(userWalletFee || '0')
		);
	}

	return balance;
};

const BridgeInputLZ = ({ submit, loadingState }: BridgeInputType) => {
	const dispatch = useDispatch();
	const [destinationAddr, setDestinationAddr] = useState('');
	const [amount, setAmount] = useState('');
	const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
	const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();
	const settings = useSelector((state: RootState) => state.settings);
	const sourceTokenID = useSelector(
		(state: RootState) => state.newTx.sourceTokenID,
	);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain, destinationChain } = useSelector(
		(state: RootState) => state.chain,
	);
	const supportedSourceTokenOptions = useSupportedSourceTokenOptions(
		settings,
		chain,
		destinationChain,
	);

	const setSourceTokenID = useCallback(
		(newSrcTokID: number | undefined) =>
			dispatch(setNewTxSourceTokenIDAction(newSrcTokID)),
		[dispatch],
	);

	useEffect(() => {
		setSourceTokenID(undefined);
		return () => {
			setSourceTokenID(undefined);
		};
	}, [setSourceTokenID]);

	const currencyID = useMemo(
		() => getCurrencyID(settings, chain),
		[chain, settings],
	);

	const [bridgeTxFee, setBridgeTxFee] = useState<string>('0');

	const calculateFees = useCallback(
		async (toAddr: string, amountDfm: string, isEstimate: boolean) => {
			if (!sourceTokenID || !currencyID)
				return { totalTxFee: '0', bridgeTxFee: '0' };

			const lzResponse = await getLayerZeroTransferResponse(
				settings,
				chain,
				destinationChain,
				account,
				toAddr,
				amountDfm,
				sourceTokenID,
			);

			const txType =
				settings.layerZeroChains[chain]?.txType || TxTypeEnum.Legacy;

			let approvalTxFee = BigInt(0);
			if (lzResponse.transactionData.approvalTransaction) {
				approvalTxFee = await estimateEthTxFee(
					{
						...lzResponse.transactionData.approvalTransaction,
						from: account,
					},
					txType,
					false,
				);
			}

			const rawBaseTxFee = await estimateEthTxFee(
				{
					...lzResponse.transactionData.populatedTransaction,
					from: account,
				},
				txType,
				false,
			);

			// Add a buffer to the estimate to account for fee volatility.
			const baseTxFee = isEstimate
				? BigInt(Math.floor(Number(rawBaseTxFee) * 1.5))
				: rawBaseTxFee;

			const totalTxFee = approvalTxFee + baseTxFee;

			const lzAmount = BigInt(lzResponse.metadata.properties.amount);
			const valueBig = BigInt(
				lzResponse.transactionData.populatedTransaction.value,
			);
			const bridgeTxFee = valueBig - lzAmount;

			return {
				totalTxFee: totalTxFee.toString(10),
				bridgeTxFee: bridgeTxFee.toString(10),
			};
		},
		[account, chain, currencyID, destinationChain, settings, sourceTokenID],
	);

	const resetBridgeTxFee = useCallback(async () => {
		// Pre-fill with an estimate so validations can account for fees even before the user enters an amount.
		// Uses a small amount + dummy recipient; this is approximate.
		if (!sourceTokenID || !currencyID) return;

		try {
			const { totalTxFee, bridgeTxFee } = await calculateFees(
				'0x0000000000000000000000000000000000000001',
				'1000000000000',
				true,
			);
			setBridgeTxFee(bridgeTxFee);
			setUserWalletFee(totalTxFee);
		} catch (e) {
			// If estimation fails (RPC limitations, wrong network), keep defaults.
			captureException(e, {
				tags: {
					component: 'LayerZeroBridgeInput.ts',
					action: 'resetBridgeTxFee',
				},
			});
		}
	}, [calculateFees, currencyID, sourceTokenID]);

	const fetchWalletFee = useCallback(async () => {
		if (!destinationAddr || !amount || !sourceTokenID || !currencyID) {
			setUserWalletFee(undefined);
			await resetBridgeTxFee();

			return;
		}

		try {
			const amountDfm = convertApexToDfm(amount || '0', chain);
			const { totalTxFee, bridgeTxFee } = await calculateFees(
				destinationAddr,
				amountDfm,
				false,
			);

			setBridgeTxFee(bridgeTxFee);
			setUserWalletFee(totalTxFee);
		} catch (e) {
			captureException(e, {
				tags: {
					component: 'LayerZeroBridgeInput.ts',
					action: 'fetchWalletFee',
				},
			});
		}
	}, [
		destinationAddr,
		amount,
		calculateFees,
		chain,
		currencyID,
		resetBridgeTxFee,
		sourceTokenID,
	]);

	const setSourceTokenCallback = useCallback(
		(tokenID: number) => {
			setSourceTokenID(tokenID);
			setAmount('');
			resetBridgeTxFee();
		},
		[resetBridgeTxFee, setSourceTokenID],
	);

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

	useEffect(() => {
		if (
			!supportedSourceTokenOptions.some(
				(x) => +(x.value || '0') === sourceTokenID,
			) &&
			supportedSourceTokenOptions.length > 0
		) {
			setSourceTokenID(+supportedSourceTokenOptions[0].value);
		}
	}, [setSourceTokenID, sourceTokenID, supportedSourceTokenOptions]);

	const onDiscard = () => {
		setDestinationAddr('');
		setAmount('');
	};

	const handleSourceTokenChange = useCallback(
		(e: SelectChangeEvent<string>) => {
			setSourceTokenCallback(+e.target.value);
		},
		[setSourceTokenCallback],
	);

	const memoizedTokenIcon = useMemo(
		() => getTokenInfo(sourceTokenID).icon,
		[sourceTokenID],
	);

	const currencyMaxAmount = calculateMaxAmountCurrency(
		totalDfmBalance,
		sourceTokenID,
		currencyID,
		bridgeTxFee || '0',
		userWalletFee || '0',
	);
	const tokenMaxAmounts = calculateMaxAmountToken(
		totalDfmBalance,
		sourceTokenID,
		currencyID,
	);
	const maxAmount =
		sourceTokenID && currencyID && sourceTokenID !== currencyID
			? tokenMaxAmounts
			: currencyMaxAmount;

	const onSubmit = useCallback(async () => {
		if (!sourceTokenID) return;
		await submit(
			destinationAddr,
			convertApexToDfm(amount || '0', chain),
			sourceTokenID,
		);
	}, [amount, destinationAddr, submit, chain, sourceTokenID]);

	// compute entered amount in DFM/wei (same unit as your balances)
	const enteredDfm = BigInt(convertApexToDfm(amount || '0', chain));

	// validations
	const isZero = enteredDfm === BigInt(0);
	const overByBalance = enteredDfm > maxAmount;

	const disableMoveFunds =
		!!loadingState ||
		maxAmount < 0 || // you already had this
		isZero || // prevent empty/zero submits
		overByBalance; // entered > wallet balance (minus fees)

	return (
		<Box sx={{ width: '100%' }}>
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 2,
					width: '100%',
				}}
			>
				{/* Destination address */}
				<Box>
					<Typography sx={{ color: 'white', mb: 1 }}>
						Destination Address
					</Typography>
					<PasteTextInput
						sx={{ width: '100%' }}
						text={destinationAddr}
						setText={setDestinationAddr}
						disabled={!!loadingState}
						id="dest-addr"
					/>
				</Box>

				{/* Source Token (only if skyline) */}
				{appSettings.isSkyline && (
					<Box>
						<Typography sx={{ color: 'white', mb: 1 }}>
							Source Token
						</Typography>
						<CustomSelect
							id="src-tokens"
							label="SourceToken"
							icon={memoizedTokenIcon}
							value={
								sourceTokenID ? sourceTokenID.toString() : ''
							}
							onChange={handleSourceTokenChange}
							options={supportedSourceTokenOptions}
							width="100%"
						/>
					</Box>
				)}
			</Box>

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
					maxAmounts={{
						maxByBalance: maxAmount,
						maxByAllowed: maxAmount,
					}}
					currencyMaxAmount={currencyMaxAmount}
					text={amount}
					setAmount={setAmount}
					disabled={!!loadingState}
					sx={{
						gridColumn: 'span 1',
						borderBottom: '2px solid',
						borderImageSource:
							'linear-gradient(180deg, #435F69 10.63%, rgba(67, 95, 105, 0) 130.31%)',
						borderImageSlice: 1,
						paddingBottom: 2,
						paddingTop: 2,
					}}
					id="bridge-amount"
				/>

				<FeeInformation
					userWalletFee={userWalletFee || '0'}
					bridgeTxFee={bridgeTxFee || '0'}
					chain={chain}
					bridgingMode={BridgingModeEnum.LayerZero}
					sx={{
						gridColumn: 'span 1',
						border: '1px solid #077368',
						borderRadius: '8px',
						padding: 2,
					}}
					isFeeInformation={true}
				/>

				{!!loadingState && (
					<Box
						sx={{
							gridColumn: 'span 2',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<SubmitLoading loadingState={loadingState} />
					</Box>
				)}

				<ButtonCustom
					onClick={onDiscard}
					disabled={!!loadingState}
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
					variant={appSettings.isSkyline ? 'whiteSkyline' : 'white'}
					disabled={disableMoveFunds}
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

export default BridgeInputLZ;
