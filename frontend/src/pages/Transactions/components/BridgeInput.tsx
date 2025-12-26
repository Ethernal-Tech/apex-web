import { Box, Typography, SelectChangeEvent } from '@mui/material';
import PasteTextInput from '../components/PasteTextInput';
import PasteApexAmountInput from './PasteApexAmountInput';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import TotalBalance from './TotalBalance';
import { ReactComponent as OneDirectionArrowIcon } from '../../../assets/oneDirectionArrow.svg';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	calculateChangeMinUtxo,
	convertApexToDfm,
	convertDfmToWei,
	minBigInt,
} from '../../../utils/generalUtils';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
	CardanoTransactionFeeResponseDto,
	ChainEnum,
	CreateEthTransactionResponseDto,
} from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthGas } from '../../../actions/submitTx';
import {
	isCardanoChain,
	isEvmChain,
	getChainInfo,
	getSrcChains,
	getDstChains,
} from '../../../settings/chain';
import SubmitLoading from './SubmitLoading';
import { SubmitLoadingState } from '../../../utils/statusUtils';
import InfoBox from './InfoBox';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import {
	setChainAction,
	setDestinationChainAction,
} from '../../../redux/slices/chainSlice';

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
	loadingState: SubmitLoadingState | undefined;
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
	loadingState,
}: BridgeInputType) => {
	const [destinationAddr, setDestinationAddr] = useState('');
	const [amount, setAmount] = useState('');
	const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
	const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

	const dispatch = useDispatch();

	const walletUTxOs = useSelector(
		(state: RootState) => state.accountInfo.utxos,
	);
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain, destinationChain } = useSelector(
		(state: RootState) => state.chain,
	);
	const wallet = useSelector((state: RootState) => state.wallet.wallet);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const settings = useSelector((state: RootState) => state.settings);
	const minValueToBridge = useSelector(
		(state: RootState) => state.settings.minValueToBridge,
	);
	const maxAmountAllowedToBridge = useSelector(
		(state: RootState) => state.settings.maxAmountAllowedToBridge,
	);
	const validatorChangeInProgress = useSelector(
		(state: RootState) => state.settings.validatorStatus,
	);

	const srcChain = chain;
	const dstChain = destinationChain;
	const isLoggedInMemo = !!wallet && !!account;
	const srcChainOptions = useMemo(
		() => getSrcChains(settings).map((x) => getChainInfo(x)),
		[settings],
	);
	const dstChainOptions = useMemo(
		() => getDstChains(srcChain, settings).map((x) => getChainInfo(x)),
		[srcChain, settings],
	);
	const srcChainInfo = useMemo(() => getChainInfo(srcChain), [srcChain]);
	const dstChainInfo = useMemo(() => getChainInfo(dstChain), [dstChain]);

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

	useEffect(() => {
		if (
			(!srcChain || !srcChainOptions.some((x) => x.value === srcChain)) &&
			srcChainOptions.length > 0
		) {
			dispatch(setChainAction(srcChainOptions[0].value));
		}
	}, [srcChain, srcChainOptions, dispatch]);

	useEffect(() => {
		if (
			(!dstChain || !dstChainOptions.some((x) => x.value === dstChain)) &&
			dstChainOptions.length > 0
		) {
			dispatch(setDestinationChainAction(dstChainOptions[0].value));
		}
	}, [dstChain, dstChainOptions, dispatch]);

	const onChangeDstChain = useCallback(
		(evnt: SelectChangeEvent<string>) =>
			dispatch(setDestinationChainAction(evnt.target.value as ChainEnum)),
		[dispatch],
	);

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

	const hasInsufficientBalance =
		BigInt(convertApexToDfm(amount, chain)) > maxAmounts.maxByBalance;
	const overMaxAllowed =
		BigInt(convertApexToDfm(amount, chain)) > maxAmounts.maxByAllowed;

	const onSubmit = useCallback(async () => {
		await submit(destinationAddr, convertApexToDfm(amount || '0', chain));
	}, [amount, destinationAddr, submit, chain]);

	return (
		<Box sx={{ width: '100%' }}>
			<Box
				p={3}
				mt={2}
				borderRadius={5}
				sx={{
					backgroundColor: '#242625',
				}}
			>
				<Box display="flex" flexDirection="column">
					<Typography
						mb={'4px'}
						fontWeight={400}
						sx={{ color: '#fff', fontSize: '13px' }}
					>
						From
					</Typography>

					{srcChainOptions.length > 0 && (
						<CustomSelect
							label="Source"
							icon={srcChainInfo.icon}
							value={srcChain}
							disabled={isLoggedInMemo || !!loadingState}
							options={srcChainOptions}
						/>
					)}
				</Box>
				<Box marginTop={2.5}>
					<Box display="flex" justifyContent="space-between">
						<Typography
							sx={{ color: 'white', mb: 1, fontSize: '13px' }}
						>
							Enter amount
						</Typography>

						<TotalBalance />
					</Box>
					<Box>
						<PasteApexAmountInput
							maxAmounts={maxAmounts}
							text={amount}
							setAmount={setAmount}
							disabled={!!loadingState}
							id="bridge-amount"
						/>
					</Box>
				</Box>
				<Box
					sx={{
						position: 'relative',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						'&::before': {
							content: '""',
							position: 'absolute',
							width: '100%',
							height: '1px',
							backgroundColor: '#4B4A4A',
							zIndex: 0,
						},
					}}
				>
					<OneDirectionArrowIcon style={{ zIndex: 1 }} />
				</Box>
				<Box display="flex" flexDirection="column">
					<Typography
						mb={'4px'}
						fontWeight={400}
						sx={{ color: '#fff', fontSize: '13px' }}
					>
						To
					</Typography>

					{dstChainOptions.length > 0 && (
						<CustomSelect
							label="Destination"
							icon={dstChainInfo.icon}
							value={dstChain}
							disabled={
								dstChainOptions.length < 2 || !!loadingState
							}
							onChange={onChangeDstChain}
							options={dstChainOptions}
						/>
					)}
				</Box>
				<Box marginY={2}>
					<Typography
						sx={{ color: 'white', mb: 1, fontSize: '13px' }}
					>
						Destination Address
					</Typography>
					{/* validate inputs */}
					<PasteTextInput
						text={destinationAddr}
						setText={setDestinationAddr}
						disabled={!!loadingState}
						id="dest-addr"
					/>
				</Box>
			</Box>

			{/* 'Move funds' button */}
			<Box marginTop={3} display="flex" justifyContent="center" gap={2}>
				{loadingState ? (
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
				) : (
					<ButtonCustom
						onClick={onSubmit}
						variant="primary"
						disabled={
							validatorChangeInProgress !== false ||
							!!loadingState ||
							BigInt(maxAmount) <= 0 ||
							hasInsufficientBalance ||
							overMaxAllowed
						}
						sx={{
							gridColumn: 'span 1',
							textTransform: 'uppercase',
						}}
						id="bridge-tx"
					>
						Move funds
					</ButtonCustom>
				)}
			</Box>

			<InfoBox
				userWalletFee={userWalletFee || '0'}
				bridgeTxFee={bridgeTxFee}
				chain={chain}
				isFeeInformation={!validatorChangeInProgress}
			/>
		</Box>
	);
};

export default BridgeInput;
