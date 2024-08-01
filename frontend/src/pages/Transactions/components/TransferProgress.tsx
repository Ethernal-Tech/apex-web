import { Box, Typography } from "@mui/material"
import {ReactComponent as Done1icon} from "../../../assets/bridge-status-icons/step-done1.svg"
import {ReactComponent as Done2icon} from "../../../assets/bridge-status-icons/step-done2.svg"
import {ReactComponent as Done3icon} from "../../../assets/bridge-status-icons/step-done3.svg"
import ButtonCustom from "../../../components/Buttons/ButtonCustom"
import { TRANSACTIONS_ROUTE } from "../../PageRouter"
import { useNavigate } from "react-router-dom"
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../../../swagger/apexBridgeApiService"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTryCatchJsonByAction } from "../../../utils/fetchUtils"
import { isStatusFinal } from "../../../utils/statusUtils"
import { getAction } from "../action"
import { capitalizeWord } from "../../../utils/generalUtils"
import { openExplorer } from "../../../utils/chainUtils"
import { fetchAndUpdateBalanceAction } from "../../../actions/balance"
import { useDispatch } from "react-redux"
// import {ReactComponent as ErrorIcon} from "../../../assets/bridge-status-icons/error.svg"

const TRANSFER_PROGRESS_TEXT = {
    ERROR: 'Transfer error',
    DONE: 'Transfer done',
    IN_PROGRESS: 'Transfer in progress',
}

const STEP_STATUS = {
    WAITING:'WAITING',
    IN_PROGRESS:'IN_PROGRESS',
    DONE:'DONE',
    ERROR:'ERROR',
}

type StepType = {
    number:number,
    text: string,
    status:string,
    doneIcon: React.ReactNode
}

interface TransferStepProps {
    step: StepType
}

const defaultSteps:StepType[] = [
    {
        number:1,
        text:'',
        status:STEP_STATUS.WAITING,
        doneIcon:<Done1icon/>
    },
    {
        number:2,
        text:'',
        status:STEP_STATUS.WAITING,
        doneIcon:<Done2icon/>
    },
    {
        number:3,
        text:'',
        status:STEP_STATUS.WAITING,
        doneIcon:<Done3icon/>
    },
]

const getStepText = (stepNumber: number, originChain: ChainEnum, destinationChain: ChainEnum) => {
    if (stepNumber === 1) {
        return `Your address on the ${capitalizeWord(originChain)} Chain sends assets to the Bridge Wallet.`;
    }

    if (stepNumber === 3) {
        return `The assets goes from the Bridge Wallet to the address on the ${capitalizeWord(destinationChain)} Chain.`;
    }

    return 'There is a blockchain of the bridge that facilitates the transaction.';
}

const getStepStatus = (stepNumber: number, txStatus: TransactionStatusEnum) => {
    switch (txStatus) {
        case TransactionStatusEnum.Pending:
        case TransactionStatusEnum.DiscoveredOnSource: {
            return stepNumber === 1 ? STEP_STATUS.IN_PROGRESS : STEP_STATUS.WAITING;
        }
        case TransactionStatusEnum.InvalidRequest: {
            return stepNumber === 1 ? STEP_STATUS.ERROR : STEP_STATUS.WAITING;
        }
        case TransactionStatusEnum.SubmittedToBridge:
        case TransactionStatusEnum.IncludedInBatch:
        case TransactionStatusEnum.FailedToExecuteOnDestination: {
            switch (stepNumber) {
                case 1: return STEP_STATUS.DONE;
                case 2: return STEP_STATUS.IN_PROGRESS;
                default: return STEP_STATUS.WAITING;
            }
        }
        case TransactionStatusEnum.SubmittedToDestination: {
            switch (stepNumber) {
                case 1:
                case 2: {
                    return STEP_STATUS.DONE;
                }
                case 3: return STEP_STATUS.IN_PROGRESS;
                default: return STEP_STATUS.WAITING;
            }
        }
        case TransactionStatusEnum.ExecutedOnDestination: {
            return STEP_STATUS.DONE;
        }
        default: return STEP_STATUS.WAITING;
    }
}

const getTransferProgress = (txStatus: TransactionStatusEnum) => {
    switch (txStatus) {
        case TransactionStatusEnum.ExecutedOnDestination: return TRANSFER_PROGRESS_TEXT.DONE;
        case TransactionStatusEnum.InvalidRequest: return TRANSFER_PROGRESS_TEXT.ERROR;
        default: return TRANSFER_PROGRESS_TEXT.IN_PROGRESS;
    }
}

const TransferStep = ({step}:TransferStepProps) => {
    return (
        <Box sx={{textAlign:'center'}}>
            
            {/* waiting or in_progress status */}
            {(step.status === STEP_STATUS.WAITING || step.status === STEP_STATUS.IN_PROGRESS) && (
                <Box sx={{
                    color:'#F25041',
                    borderRadius:'100px',
                    border:'1px solid #F25041',
                    display:'inline-block',
                    width:'24px',
                    height:'24px',
                }}>
                    {step.number}
                </Box>
            )}
            
            {/* done status */}
            {step.status === STEP_STATUS.DONE && (
                <Box sx={{
                    display:'inline-block',
                    width:'24px',
                    height:'24px',
                }}>
                    {step.doneIcon}
                </Box>
            )}
            
            {/* error status */}
            {step.status === STEP_STATUS.ERROR && (
                <Box sx={{
                    color:'white',
                    background:'#F25041',
                    borderRadius:'100px',
                    border:'1px solid #F25041',
                    display:'inline-block',
                    width:'24px',
                    height:'24px',
                }}>
                    !
                </Box>
            )}

            <Typography sx={{color:'white'}}>
                {step.text}
            </Typography>
        </Box>
    )
}

interface TransferProgressProps {
    bridgeTx: BridgeTransactionDto
}

const TransferProgress = ({
    bridgeTx,
}: TransferProgressProps) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();
    const [tx, setTx] = useState<BridgeTransactionDto>(bridgeTx);
    
    const fetchTx = useCallback(async () => {
        const bindedAction = getAction.bind(null, tx.id);

        const [response] = await Promise.all([
            fetchFunction(bindedAction),
            fetchAndUpdateBalanceAction(dispatch),
        ])

        setTx(response);

        return response;
    }, [fetchFunction, dispatch, tx.id])

	useEffect(() => {
		fetchTx()

        const handle = setInterval(async () => {
            const tx = await fetchTx();
            if (tx && isStatusFinal(tx.status)) {
                clearInterval(handle);
            }
        }, 5000);

        return () => {
            clearInterval(handle);
        }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

    const steps = useMemo(() => {
        return defaultSteps.map(dStep => {
            const text = getStepText(dStep.number, tx.originChain, tx.destinationChain);
            const status = getStepStatus(dStep.number, tx.status);
            return {
                ...dStep,
                text,
                status,
            }
        })
    }, [tx.destinationChain, tx.originChain, tx.status])

    const onOpenExplorer = () => openExplorer(tx);

    return (
        <Box>
            <Typography sx={{color:'white',mt:4, mb:2, textAlign:'center'}}>
                {getTransferProgress(tx.status)}
            </Typography>

            <Box sx={{
                mt:4,
                display:'flex',
                justifyContent:"space-evenly",
                gap:'40px'
            }}>
                {steps.map(step=> <TransferStep key={step.number} step={step}/>)}
            </Box>

            <Box sx={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'20px',mt:4}}>
                <ButtonCustom  
                    variant="red" 
                    onClick={()=> navigate(TRANSACTIONS_ROUTE)}
                    sx={{ gridColumn:'span 1', textTransform:'uppercase'}}>
                    View bridging history
                </ButtonCustom>

                <ButtonCustom  
                    variant="white" 
                    onClick={onOpenExplorer}
                    sx={{ gridColumn:'span 1', textTransform:'uppercase'}}>
                    View Explorer
                </ButtonCustom>
                
                {/* TODO af - removed for now as bridge doesn't currently support refunds */}
                {/* <ButtonCustom  variant="white" sx={{ gridColumn:'span 1', textTransform:'uppercase' }}>
                    request a refund
                </ButtonCustom> */}
            </Box>
        </Box>
    )
}

export default TransferProgress