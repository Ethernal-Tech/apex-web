import { Box, SelectChangeEvent, Typography } from '@mui/material';
import TotalBalance from '../components/TotalBalance';
import PasteTextInput from '../components/PasteTextInput';
import PasteApexAmountInput from './PasteApexAmountInput';
import FeeInformation from '../components/FeeInformation';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	calculateChangeUtxoMinValue,
	calculateTokenUtxoMinValue,
	convertApexToDfm,
	convertDfmToWei,
	createUtxo,
	minBigInt,
} from '../../../utils/generalUtils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
	CardanoTransactionFeeResponseDto,
	ChainEnum,
	CreateEthTransactionFullResponseDto,
	TxTypeEnum,
} from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthTxFee } from '../../../actions/submitTx';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import { white } from '../../../containers/theme';
import { useSupportedSourceTokenOptions } from '../utils';
import {
	BridgingModeEnum,
	getBridgingMode,
	isCardanoChain,
	isEvmChain,
} from '../../../settings/chain';
import { getCurrencyID, getTokenInfo } from '../../../settings/token';
import SubmitLoading from './SubmitLoading';
import { SubmitLoadingState } from '../../../utils/statusUtils';
import { captureException } from '../../../features/sentry';
import { setNewTxSourceTokenIDAction } from '../../../redux/slices/newTxSlice';

type BridgeInputType = {
	getCardanoTxFee: (
		address: string,
		amount: string,
		tokenID: number,
	) => Promise<CardanoTransactionFeeResponseDto>;
	getEthTxFee: (
		address: string,
		amount: string,
		tokenID: number,
	) => Promise<CreateEthTransactionFullResponseDto>;
	submit: (address: string, amount: string, tokenID: number) => Promise<void>;
	loadingState: SubmitLoadingState | undefined;
};

const calculateMaxAmountToken = (
	totalDfmBalance: { [key: string]: string },
	sourceTokenID: number | undefined,
	currencyID: number | undefined,
	maxTokenAmountAllowedToBridge: string,
): { maxByBalance: bigint; maxByAllowed: bigint } => {
	if (
		!totalDfmBalance ||
		!sourceTokenID ||
		!currencyID ||
		sourceTokenID === currencyID
	) {
		return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
	}

	const tokenBalance = BigInt(totalDfmBalance[sourceTokenID] || '0');

	const tokenBalanceAllowedToUse =
		BigInt(maxTokenAmountAllowedToBridge || '0') !== BigInt(0) &&
		tokenBalance > BigInt(maxTokenAmountAllowedToBridge || '0')
			? BigInt(maxTokenAmountAllowedToBridge || '0')
			: tokenBalance;

	return {
		maxByAllowed: tokenBalanceAllowedToUse,
		maxByBalance: tokenBalance,
	};
};

const calculateMaxAmountCurrency = (
	totalDfmBalance: { [key: string]: string },
	sourceTokenID: number | undefined,
	currencyID: number | undefined,
	maxAmountAllowedToBridge: string,
	chain: ChainEnum,
	changeMinUtxo: number,
	minEvmWeiValue: string,
	bridgeTxFee: string,
	operationFee: string,
): { maxByBalance: bigint; maxByAllowed: bigint } => {
	if (!totalDfmBalance || !sourceTokenID || !currencyID || !chain) {
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
		BigInt(totalDfmBalance[currencyID] || '0') > maxAmountAllowedToBridgeDfm
			? maxAmountAllowedToBridgeDfm
			: BigInt(totalDfmBalance[currencyID] || '0');

	let maxByBalance;
	if (isEvmChain(chain)) {
		maxByBalance =
			BigInt(totalDfmBalance[currencyID] || '0') -
			BigInt(bridgeTxFee) -
			BigInt(minEvmWeiValue) -
			BigInt(operationFee);
	} else {
		maxByBalance =
			BigInt(totalDfmBalance[currencyID] || '0') -
			BigInt(appSettings.potentialWalletFee) -
			BigInt(bridgeTxFee) -
			BigInt(changeMinUtxo) -
			BigInt(operationFee);
	}

	return { maxByAllowed: balanceAllowedToUse, maxByBalance };
};

const BridgeInput = ({
	getCardanoTxFee,
	getEthTxFee,
	submit,
	loadingState,
}: BridgeInputType) => {
	const dispatch = useDispatch();
	const [destinationAddr, setDestinationAddr] = useState('');
	const [amount, setAmount] = useState('');
	const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
	const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();
	const sourceTokenID = useSelector(
		(state: RootState) => state.newTx.sourceTokenID,
	);

	const walletUTxOs = useSelector(
		(state: RootState) => state.accountInfo.utxos,
	);
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain, destinationChain } = useSelector(
		(state: RootState) => state.chain,
	);
	const settings = useSelector((state: RootState) => state.settings);
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
		setSourceTokenID(
			supportedSourceTokenOptions.length > 0
				? +supportedSourceTokenOptions[0].value
				: undefined,
		);
		return () => {
			setSourceTokenID(undefined);
		};
	}, [setSourceTokenID, supportedSourceTokenOptions]);

	const reactorValidatorChangeInProgress = useSelector(
		(state: RootState) => state.settings.reactorValidatorStatus,
	);

	const bridgingModeInfo = getBridgingMode(
		settings,
		chain,
		destinationChain,
		sourceTokenID || 0,
	);

	const {
		minValueToBridge,
		maxAmountAllowedToBridge,
		maxTokenAmountAllowedToBridge,
		minUtxoChainValue,
		minChainFeeForBridging,
		minChainFeeForBridgingTokens,
		minOperationFee,
	} = bridgingModeInfo?.settings?.bridgingSettings || {
		minValueToBridge: 0,
		maxAmountAllowedToBridge: '0',
		maxTokenAmountAllowedToBridge: '0',
		minUtxoChainValue: {} as { [key: string]: number },
		minChainFeeForBridging: {} as { [key: string]: number },
		minChainFeeForBridgingTokens: {} as { [key: string]: number },
		minOperationFee: {} as { [key: string]: number },
	};

	const currencyID = useMemo(
		() => getCurrencyID(settings, chain),
		[chain, settings],
	);

	const minUtxoValue =
		(minUtxoChainValue && minUtxoChainValue[chain]) ||
		appSettings.minUtxoChainValue[chain];

	const defaultOperationFee = useMemo(
		() =>
			isEvmChain(chain)
				? convertDfmToWei(minOperationFee[chain] || '0')
				: (minOperationFee[chain] || '0') + '',
		[chain, minOperationFee],
	);

	const [operationFee, setOperationFee] =
		useState<string>(defaultOperationFee);

	const resetOperationFee = useCallback(
		() => setOperationFee(defaultOperationFee),
		[defaultOperationFee],
	);

	useEffect(() => {
		setOperationFee(defaultOperationFee);
	}, [defaultOperationFee, setOperationFee]);

	const defaultBridgeTxFee = useMemo(
		() =>
			isEvmChain(chain)
				? convertDfmToWei(minChainFeeForBridging[chain] || '0')
				: !sourceTokenID || !currencyID || sourceTokenID === currencyID
					? (minChainFeeForBridging[chain] || '0') + ''
					: (minChainFeeForBridgingTokens[chain] || '0') + '',
		[
			chain,
			minChainFeeForBridging,
			minChainFeeForBridgingTokens,
			sourceTokenID,
			currencyID,
		],
	);

	const [bridgeTxFee, setBridgeTxFee] = useState<string>(defaultBridgeTxFee);

	const resetBridgeTxFee = useCallback(
		() => setBridgeTxFee(defaultBridgeTxFee),
		[defaultBridgeTxFee],
	);

	useEffect(() => {
		setBridgeTxFee(defaultBridgeTxFee);
	}, [defaultBridgeTxFee, setBridgeTxFee]);

	const fetchWalletFee = useCallback(async () => {
		if (!destinationAddr || !amount || !sourceTokenID || !currencyID) {
			setUserWalletFee(undefined);
			resetBridgeTxFee();
			resetOperationFee();

			return;
		}

		try {
			if (isCardanoChain(chain)) {
				const feeResp = await getCardanoTxFee(
					destinationAddr,
					convertApexToDfm(amount || '0', chain),
					sourceTokenID,
				);
				setUserWalletFee(BigInt(feeResp?.fee || '0').toString(10));
				setBridgeTxFee(
					BigInt(feeResp?.bridgingFee || '0').toString(10),
				);
				setOperationFee(
					BigInt(feeResp?.operationFee || '0').toString(10),
				);

				return;
			} else if (isEvmChain(chain)) {
				const feeResp = await getEthTxFee(
					destinationAddr,
					convertApexToDfm(amount || '0', chain),
					sourceTokenID,
				);

				const { bridgingTx, approvalTx } = feeResp;

				let approvalTxFee = BigInt(0);
				if (approvalTx) {
					approvalTxFee = await estimateEthTxFee(
						approvalTx,
						TxTypeEnum.London,
						false,
					);
				}

				const fee = await estimateEthTxFee(
					feeResp.bridgingTx.ethTx,
					TxTypeEnum.London,
					bridgingTx.isFallback,
				);

				const totalTxFee = approvalTxFee + fee;
				setUserWalletFee(totalTxFee.toString());

				setBridgeTxFee(
					BigInt(bridgingTx.bridgingFee || '0').toString(10),
				);
				setOperationFee(
					BigInt(bridgingTx.operationFee || '0').toString(10),
				);

				return;
			}
		} catch (e) {
			console.log('error while calculating wallet fee', e);
			captureException(e, {
				tags: {
					component: 'BridgeInput.ts',
					action: 'fetchWalletFee',
				},
			});
		}

		setUserWalletFee(undefined);
	}, [
		destinationAddr,
		amount,
		sourceTokenID,
		currencyID,
		resetBridgeTxFee,
		resetOperationFee,
		chain,
		getCardanoTxFee,
		getEthTxFee,
	]);

	const setSourceTokenCallback = useCallback(
		(tokenID: number) => {
			setSourceTokenID(tokenID);
			setAmount('');
			resetBridgeTxFee();
			resetOperationFee();
		},
		[resetBridgeTxFee, resetOperationFee, setSourceTokenID],
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

	const onDiscard = () => {
		setDestinationAddr('');
		setAmount('');
	};

	const changeMinUtxo = useMemo(
		() => calculateChangeUtxoMinValue(walletUTxOs, +minUtxoValue),
		[walletUTxOs, minUtxoValue],
	);

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

	const minEvmWeiValue =
		isEvmChain(chain) &&
		(!sourceTokenID || !currencyID || sourceTokenID === currencyID)
			? convertDfmToWei(minValueToBridge)
			: '0';

	// when bridging native tokens, the lovelace that must also be given to the bridge for carrying native tokens
	// is calculated later. in case for example insufficient lovelace balance, the call where the calculation
	// takes place fails, bridgingFee never gets updated, and the `Insufficient ADA` is never shown
	const adjustedBridgeTxFee = useMemo(() => {
		if (
			(settings.bridgingAddresses || []).length === 0 ||
			isEvmChain(chain) ||
			!sourceTokenID ||
			!currencyID ||
			sourceTokenID === currencyID ||
			bridgeTxFee === '0' ||
			bridgeTxFee !== defaultBridgeTxFee
		) {
			return bridgeTxFee;
		}

		const tokenConfig = (settings.directionConfig[chain] || { tokens: {} })
			.tokens[sourceTokenID];

		if (!tokenConfig) {
			return bridgeTxFee;
		}

		const approxAdditionToBridgingFee = calculateTokenUtxoMinValue(
			createUtxo(settings.bridgingAddresses[0], '0', {
				[tokenConfig.chainSpecific]: convertApexToDfm(
					amount || '1',
					chain,
				),
			}),
			+minUtxoValue,
		);

		return (
			BigInt(bridgeTxFee) + BigInt(approxAdditionToBridgingFee)
		).toString(10);
	}, [
		amount,
		bridgeTxFee,
		chain,
		currencyID,
		defaultBridgeTxFee,
		minUtxoValue,
		settings.bridgingAddresses,
		settings.directionConfig,
		sourceTokenID,
	]);

	const currencyMaxAmounts = calculateMaxAmountCurrency(
		totalDfmBalance,
		sourceTokenID,
		currencyID,
		maxAmountAllowedToBridge,
		chain,
		changeMinUtxo,
		minEvmWeiValue,
		adjustedBridgeTxFee,
		operationFee,
	);
	const tokenMaxAmounts = calculateMaxAmountToken(
		totalDfmBalance,
		sourceTokenID,
		currencyID,
		maxTokenAmountAllowedToBridge,
	);
	const maxAmounts =
		sourceTokenID && currencyID && sourceTokenID !== currencyID
			? tokenMaxAmounts
			: currencyMaxAmounts;
	const currencyMaxAmount = minBigInt(
		currencyMaxAmounts.maxByAllowed,
		currencyMaxAmounts.maxByBalance,
	);

	const insufficientBalance =
		BigInt(convertApexToDfm(amount || '0', chain)) >
		maxAmounts.maxByBalance;
	const overMaxAllowed =
		BigInt(convertApexToDfm(amount || '0', chain)) >
			maxAmounts.maxByAllowed && maxAmounts.maxByAllowed > 0;
	const insufficientCurrency = currencyMaxAmount < 0;

	const onSubmit = useCallback(async () => {
		if (!sourceTokenID) return;
		await submit(
			destinationAddr,
			convertApexToDfm(amount || '0', chain),
			sourceTokenID,
		);
	}, [amount, destinationAddr, submit, chain, sourceTokenID]);

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
				disabled={!!loadingState}
				id="dest-addr"
			/>
			{appSettings.isSkyline && (
				<Box sx={{ mt: '20px' }}>
					<Typography mb={'7px'} sx={{ color: white }}>
						Source Token
					</Typography>
					<CustomSelect
						id="src-tokens"
						label="SourceToken"
						icon={memoizedTokenIcon}
						value={sourceTokenID ? sourceTokenID.toString() : ''}
						onChange={handleSourceTokenChange}
						options={supportedSourceTokenOptions}
						width="50%"
					/>
				</Box>
			)}

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
					bridgeTxFee={adjustedBridgeTxFee || '0'}
					operationFee={operationFee || '0'}
					chain={chain}
					bridgingMode={bridgingModeInfo.bridgingMode}
					sx={{
						gridColumn: 'span 1',
						border: '1px solid #077368',
						borderRadius: '8px',
						padding: 2,
					}}
					isFeeInformation={
						bridgingModeInfo.bridgingMode !==
							BridgingModeEnum.Reactor ||
						!reactorValidatorChangeInProgress
					}
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
					disabled={
						!!loadingState ||
						insufficientBalance ||
						insufficientCurrency ||
						overMaxAllowed ||
						(bridgingModeInfo.bridgingMode ===
							BridgingModeEnum.Reactor &&
							reactorValidatorChangeInProgress !== false)
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
