import { Box, SelectChangeEvent, Typography } from '@mui/material';
import TotalBalance from '../components/TotalBalance';
import PasteTextInput from '../components/PasteTextInput';
import PasteApexAmountInput from './PasteApexAmountInput';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { convertApexToDfm } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
	ChainEnum,
	TxTypeEnum,
	TransactionDataDto,
	TokenEnum,
} from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import { useSupporedSourceLZTokenOptions } from '../utils';
import { BridgingModeEnum, getChainInfo } from '../../../settings/chain';
import {
	getTokenInfo,
	isCurrencyBridgingAllowed,
	isWrappedToken,
} from '../../../settings/token';
import FeeInformation from './FeeInformation';
import {
	estimateEthTxFee,
	getLayerZeroTransferResponse,
} from '../../../actions/submitTx';
import SubmitLoading from './SubmitLoading';
import { SubmitLoadingState } from '../../../utils/statusUtils';

type BridgeInputType = {
	submit: (address: string, amount: string) => Promise<void>;
	loadingState: SubmitLoadingState | undefined;
};

const calculateMaxAmountToken = (
	totalDfmBalance: { [key: string]: string },
	sourceToken: TokenEnum | undefined,
): bigint => {
	if (!sourceToken || !isWrappedToken(sourceToken)) {
		return BigInt(0);
	}

	const tokenBalance = BigInt(
		(sourceToken && totalDfmBalance ? totalDfmBalance[sourceToken] : '0') ||
			'0',
	);

	return tokenBalance;
};

const calculateMaxAmountCurrency = (
	totalDfmBalance: { [key: string]: string },
	chain: ChainEnum,
): bigint => {
	if (!totalDfmBalance || !chain) {
		return BigInt(0);
	}

	const sourceToken = getChainInfo(chain).currencyToken;

	return BigInt(totalDfmBalance[sourceToken] || '0');
};

const BridgeInputLZ = ({ submit, loadingState }: BridgeInputType) => {
	const [destinationAddr, setDestinationAddr] = useState('');
	const [amount, setAmount] = useState('');
	const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
	const [sourceToken, setSourceToken] = useState<TokenEnum | undefined>();
	const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();
	const settings = useSelector((state: RootState) => state.settings);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain, destinationChain } = useSelector(
		(state: RootState) => state.chain,
	);
	const supportedSourceTokenOptions = useSupporedSourceLZTokenOptions(
		chain,
		destinationChain,
	);

	const [bridgeTxFee, setBridgeTxFee] = useState<string>('0');

	const resetBridgeTxFee = useCallback(() => setBridgeTxFee('0'), []);

	const fetchWalletFee = useCallback(async () => {
		if (!destinationAddr || !amount || !sourceToken) {
			setUserWalletFee(undefined);
			resetBridgeTxFee();

			return;
		}

		let transactionData: TransactionDataDto;

		try {
			const amountDfm = convertApexToDfm(amount || '0', chain);
			const lzResponse = await getLayerZeroTransferResponse(
				settings,
				chain,
				destinationChain,
				account,
				destinationAddr,
				amountDfm,
			);

			transactionData = lzResponse.transactionData;

			if (!isCurrencyBridgingAllowed(chain, destinationChain)) {
				setBridgeTxFee(transactionData.populatedTransaction.value);
			} else {
				const amount = BigInt(lzResponse.metadata.properties.amount);
				const valueBig = BigInt(
					transactionData.populatedTransaction.value,
				);
				setBridgeTxFee((valueBig - amount).toString(10));
			}
		} catch (e) {
			console.log('error while calculating bridging fee', e);
			setUserWalletFee(undefined);
			resetBridgeTxFee();

			return;
		}

		try {
			let approvalTxFee = BigInt(0);

			if (transactionData.approvalTransaction) {
				approvalTxFee = await estimateEthTxFee(
					{ ...transactionData.approvalTransaction, from: account },
					settings.layerZeroChains[chain]?.txType ||
						TxTypeEnum.Legacy,
					false,
				);
			}

			const baseTxFee = await estimateEthTxFee(
				{ ...transactionData.populatedTransaction, from: account },
				settings.layerZeroChains[chain]?.txType || TxTypeEnum.Legacy,
				false,
			);
			const totalTxFee = approvalTxFee + baseTxFee;

			setUserWalletFee(totalTxFee.toString(10));
		} catch (e) {
			console.log('error while calculating wallet fee', e);
		}
	}, [
		destinationAddr,
		amount,
		sourceToken,
		resetBridgeTxFee,
		chain,
		settings,
		destinationChain,
		account,
	]);

	const setSourceTokenCallback = useCallback(
		(token: TokenEnum) => {
			setSourceToken(token);
			setAmount('');
			resetBridgeTxFee();
		},
		[resetBridgeTxFee],
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
			!supportedSourceTokenOptions.some((x) => x.value === sourceToken) &&
			supportedSourceTokenOptions.length > 0
		) {
			setSourceToken(supportedSourceTokenOptions[0].value);
		}
	}, [sourceToken, supportedSourceTokenOptions]);

	const onDiscard = () => {
		setDestinationAddr('');
		setAmount('');
	};

	const handleSourceTokenChange = useCallback(
		(e: SelectChangeEvent<string>) => {
			setSourceTokenCallback(e.target.value as TokenEnum);
		},
		[setSourceTokenCallback],
	);

	const memoizedTokenIcon = useMemo(
		() => getTokenInfo(sourceToken).icon,
		[sourceToken],
	);

	const currencyMaxAmount = calculateMaxAmountCurrency(
		totalDfmBalance,
		chain,
	);
	const tokenMaxAmounts = calculateMaxAmountToken(
		totalDfmBalance,
		sourceToken,
	);
	const maxAmount =
		sourceToken && chain !== ChainEnum.Nexus && isWrappedToken(sourceToken)
			? tokenMaxAmounts
			: currencyMaxAmount;

	const onSubmit = useCallback(async () => {
		if (!sourceToken) return;
		await submit(destinationAddr, convertApexToDfm(amount || '0', chain));
	}, [amount, destinationAddr, submit, chain, sourceToken]);

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
			<TotalBalance />

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 2,
					width: '100%',
					mt: 4,
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
							value={sourceToken || ''}
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
						maxByAllowed: BigInt(0),
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
