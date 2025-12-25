import React, { useCallback, useMemo } from 'react';
import { useEffect } from 'react';
import {
	Typography,
	Box,
	Button,
	CircularProgress,
	SelectChangeEvent,
} from '@mui/material';
import CustomSelect from '../../components/customSelect/CustomSelect';
import { ReactComponent as SwitcherIcon } from '../../assets/switcher.svg';
import { ReactComponent as OneDirectionArrowIcon } from '../../assets/oneDirectionArrow.svg';
import BasePage from '../base/BasePage';
import ButtonCustom from '../../components/Buttons/ButtonCustom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useNavigate } from 'react-router-dom';
import { NEW_TRANSACTION_ROUTE } from '../PageRouter';
import {
	setChainAction as setSrcChainAction,
	setDestinationChainAction as setDstChainAction,
} from '../../redux/slices/chainSlice';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import { login } from '../../actions/login';
import { getChainInfo, getDstChains, getSrcChains } from '../../settings/chain';

const HomePage: React.FC = () => {
	const wallet = useSelector((state: RootState) => state.wallet.wallet);
	const loginConnecting = useSelector(
		(state: RootState) => state.login.connecting,
	);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const isLoggedInMemo = !!wallet && !!account;
	const settings = useSelector((state: RootState) => state.settings);

	const navigate = useNavigate();
	const dispatch = useDispatch();

	const srcChain = useSelector((state: RootState) => state.chain.chain);
	const dstChain = useSelector(
		(state: RootState) => state.chain.destinationChain,
	);

	const srcChainOptions = useMemo(
		() => getSrcChains(settings).map((x) => getChainInfo(x)),
		[settings],
	);

	const dstChainOptions = useMemo(
		() => getDstChains(srcChain, settings).map((x) => getChainInfo(x)),
		[srcChain, settings],
	);

	const isSwitchBtnEnabled = useMemo(
		() =>
			!isLoggedInMemo &&
			getDstChains(dstChain, settings).some(
				(chain) => chain === srcChain,
			),
		[srcChain, dstChain, isLoggedInMemo, settings],
	);

	const srcChainInfo = useMemo(() => getChainInfo(srcChain), [srcChain]);
	const dstChainInfo = useMemo(() => getChainInfo(dstChain), [dstChain]);

	const switchValues = useCallback(() => {
		const temp = srcChain;
		dispatch(setSrcChainAction(dstChain));
		dispatch(setDstChainAction(temp));
	}, [srcChain, dstChain, dispatch]);

	const onChangeSrcChain = useCallback(
		(evnt: SelectChangeEvent<string>) =>
			dispatch(setSrcChainAction(evnt.target.value as ChainEnum)),
		[dispatch],
	);

	const onChangeDstChain = useCallback(
		(evnt: SelectChangeEvent<string>) =>
			dispatch(setDstChainAction(evnt.target.value as ChainEnum)),
		[dispatch],
	);

	const handleConnectClick = useCallback(async () => {
		if (Object.keys(settings.allowedDirections).length > 0) {
			await login(srcChain, navigate, settings, dispatch);
		}
	}, [srcChain, settings, navigate, dispatch]);

	useEffect(() => {
		if (
			(!srcChain || !srcChainOptions.some((x) => x.value === srcChain)) &&
			srcChainOptions.length > 0
		) {
			dispatch(setSrcChainAction(srcChainOptions[0].value));
		}
	}, [srcChain, srcChainOptions, dispatch]);

	useEffect(() => {
		if (
			(!dstChain || !dstChainOptions.some((x) => x.value === dstChain)) &&
			dstChainOptions.length > 0
		) {
			dispatch(setDstChainAction(dstChainOptions[0].value));
		}
	}, [dstChain, dstChainOptions, dispatch]);

	return (
		<BasePage>
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
					sx={{
						color: '#fff',
						fontSize: '18px',
						textAlign: 'center',
					}}
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
					<Typography
						mb={'4px'}
						fontWeight={400}
						sx={{ color: '#fff', fontSize: '13px' }}
					>
						From
					</Typography>
					<CustomSelect
						label="Source"
						icon={srcChainInfo.icon}
						value={srcChain}
						disabled={isLoggedInMemo}
						onChange={onChangeSrcChain}
						options={srcChainOptions}
					/>

					<Box
						sx={{
							position: 'relative',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							mt: '20px',
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
						<Button
							onClick={switchValues}
							disabled={!isSwitchBtnEnabled}
							sx={{
								margin: 0,
								padding: 0,
								boxShadow: 'none',
								zIndex: 1,
								minWidth: '0',
								borderRadius: '100%',
								'&:hover': {
									// backgroundColor: 'transparent',
								},
							}}
						>
							{!isLoggedInMemo ? (
								<SwitcherIcon />
							) : (
								<OneDirectionArrowIcon />
							)}
						</Button>
					</Box>

					<Typography
						mb={'4px'}
						fontWeight={400}
						sx={{ color: '#fff', fontSize: '13px' }}
					>
						To
					</Typography>
					<CustomSelect
						label="Destination"
						icon={dstChainInfo.icon}
						value={dstChain}
						disabled={dstChainOptions.length < 2}
						onChange={onChangeDstChain}
						options={dstChainOptions}
					/>
				</Box>

				{/* Connect | Move funds button */}
				<Box display="flex" justifyContent="center" mt={5}>
					{loginConnecting ? (
						<ButtonCustom
							variant="primary"
							sx={{ textTransform: 'uppercase' }}
						>
							Connect Wallet
							<CircularProgress
								sx={{ marginLeft: 1 }}
								size={20}
							/>
						</ButtonCustom>
					) : !isLoggedInMemo ? (
						<ButtonCustom
							id="bridge-connect"
							variant="primary"
							sx={{ textTransform: 'uppercase' }}
							onClick={handleConnectClick}
						>
							Connect Wallet
						</ButtonCustom>
					) : (
						<ButtonCustom
							variant="primary"
							sx={{ textTransform: 'uppercase' }}
							onClick={() => navigate(NEW_TRANSACTION_ROUTE)}
							id="move-funds"
						>
							Move funds
						</ButtonCustom>
					)}
				</Box>
			</Box>
		</BasePage>
	);
};

export default HomePage;
