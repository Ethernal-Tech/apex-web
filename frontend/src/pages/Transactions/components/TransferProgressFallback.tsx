import { Box, CircularProgress, Typography } from "@mui/material"
import {ReactComponent as Done1icon} from "../../../assets/bridge-status-icons/step-done1.svg"
import {ReactComponent as Done2icon} from "../../../assets/bridge-status-icons/step-done2.svg"
import {ReactComponent as Done3icon} from "../../../assets/bridge-status-icons/step-done3.svg"
import ButtonCustom from "../../../components/Buttons/ButtonCustom"
import { TRANSACTIONS_ROUTE } from "../../PageRouter"
import { useNavigate } from "react-router-dom"
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../../../swagger/apexBridgeApiService"
import { FunctionComponent, SVGProps, useCallback, useEffect, useMemo, useState } from "react"
import { useTryCatchJsonByAction } from "../../../utils/fetchUtils"
import { isStatusFinal } from "../../../utils/statusUtils"
import { capitalizeWord } from "../../../utils/generalUtils"
import { openExplorer } from "../../../utils/chainUtils"
import { useDispatch, useSelector } from "react-redux"
// import {ReactComponent as ErrorIcon} from "../../../assets/bridge-status-icons/error.svg"

// prime icons
import {ReactComponent as PrimeInProgressIcon} from "../../../assets/bridge-status-assets/prime-progress.svg"
import {ReactComponent as PrimeSuccessIcon} from "../../../assets/bridge-status-assets/Prime.svg"
import {ReactComponent as PrimeErrorIcon} from "../../../assets/bridge-status-assets/prime-error.svg"

// vector icons
import {ReactComponent as VectorInProgressIcon} from "../../../assets/bridge-status-assets/Vector.svg"
import {ReactComponent as VectorSuccessIcon} from "../../../assets/bridge-status-assets/vector-success.svg"
import {ReactComponent as VectorErrorIcon} from "../../../assets/bridge-status-assets/vector-error.svg"

// nexus icons
import {ReactComponent as NexusInProgressIcon} from "../../../assets/bridge-status-assets/nexus.svg"
import {ReactComponent as NexusSuccessIcon} from "../../../assets/bridge-status-assets/nexus-success.svg"
import {ReactComponent as NexusErrorIcon} from "../../../assets/bridge-status-assets/nexus-error.svg"

// bridge icons
import {ReactComponent as BridgeInProgressIcon} from "../../../assets/bridge-status-assets/Bridge-Wallet.svg"
import {ReactComponent as BridgeSuccessIcon} from "../../../assets/bridge-status-assets/bridge-success.svg"
import {ReactComponent as BridgeErrorIcon} from "../../../assets/bridge-status-assets/Bridge-error.svg"

// Step number icons
import {ReactComponent as Step1} from "../../../assets/bridge-status-assets/steps/step-1.svg"
import {ReactComponent as Step2} from "../../../assets/bridge-status-assets/steps/step-2.svg"
import {ReactComponent as Step3} from "../../../assets/bridge-status-assets/steps/step-3.svg"
import { RootState } from "../../../redux/store"
/* 
const NexusInProgressIcon = VectorInProgressIcon;
const NexusSuccessIcon = VectorSuccessIcon;
const NexusErrorIcon = VectorErrorIcon; */

const TRANSFER_PROGRESS_TEXT = {
    ERROR: 'Transfer Error',
    DONE: 'Transfer Complete',
    IN_PROGRESS: 'Transfer in Progress',
}

const STEP_STATUS = {
    WAITING:'WAITING',
    IN_PROGRESS:'IN_PROGRESS',
    DONE:'DONE',
    ERROR:'ERROR',
}

type StepType = {
    number:number,
    numberIcon:FunctionComponent<SVGProps<SVGSVGElement>>,
    text: string,
    status:string,
    doneIcon: React.ReactNode,
    asset:{ // which svg icon to show
        inProgress: FunctionComponent<SVGProps<SVGSVGElement>>,
        done: FunctionComponent<SVGProps<SVGSVGElement>>,
        error: FunctionComponent<SVGProps<SVGSVGElement>>,
    }
}

interface TransferStepProps {
    step: StepType
}

// returns in progress, done, and error icons for required chain (prime, vector, nexus)
const getChainIcons = (chain:ChainEnum) => {
    return {
        inProgress: chain === ChainEnum.Prime ? PrimeInProgressIcon : chain === ChainEnum.Vector ? VectorInProgressIcon : NexusInProgressIcon,
        done: chain === ChainEnum.Prime ? PrimeSuccessIcon : chain === ChainEnum.Vector ? VectorSuccessIcon : NexusSuccessIcon,
        error: chain === ChainEnum.Prime ? PrimeErrorIcon : chain === ChainEnum.Vector ? VectorErrorIcon : NexusErrorIcon,
    }   
}

const getDefaultSteps = (sourceChain:ChainEnum, destinationChain:ChainEnum):StepType[] =>{
    return [
        {
            number:1,
            numberIcon:Step1,
            text:'',
            status:STEP_STATUS.WAITING,
            doneIcon:<Done1icon/>,
            asset:getChainIcons(sourceChain)
        },
        {
            number:2,
            numberIcon:Step2,
            text:'',
            status:STEP_STATUS.WAITING,
            doneIcon:<Done2icon/>,
            asset:{
                inProgress: BridgeInProgressIcon,
                done: BridgeSuccessIcon,
                error: BridgeErrorIcon
            }
        },
        {
            number:3,
            numberIcon:Step3,
            text:'',
            status:STEP_STATUS.WAITING,
            doneIcon:<Done3icon/>,
            asset: getChainIcons(destinationChain)
        }
    ]

}

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

const TransferStep = ({step}:TransferStepProps) => {
    return (
        <Box sx={{textAlign:'center'}}>
            <Box sx={{ display:'flex',flexDirection:'column', alignItems:'center'}}>
                {/* conditional display of svg icon depending on status. Different steps have different icons */}
                <Box sx={{height:'120px',display:'flex',alignItems:'center', marginBottom:'40px'}}>   
                    {(step.status === STEP_STATUS.WAITING || step.status === STEP_STATUS.IN_PROGRESS) && <step.asset.inProgress/>}
                    {(step.status === STEP_STATUS.DONE) && <step.asset.done/>}
                    {(step.status === STEP_STATUS.ERROR) && <step.asset.error/>}
                </Box>
                
                {/* waiting or in_progress status */}
                {(step.status === STEP_STATUS.WAITING || step.status === STEP_STATUS.IN_PROGRESS) && (
                    <Box sx={{
                        width:'24px',
                        height:'24px',
                    }}>
                        <step.numberIcon height='24px' width='24px'/>
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
                        fontSize:'16px',
                        textAlign:'center',
                        lineHeight: '24px',
                    }}>
                        !
                    </Box>
                )}
            </Box>

            <Typography sx={{color:'white', marginTop:'30px'}}>
                {step.text}
            </Typography>
        </Box>
    )
}

interface TransferProgressProps {
    tx: BridgeTransactionDto
    setTx: React.Dispatch<React.SetStateAction<BridgeTransactionDto | undefined>>
}

const TransferProgress = ({
    tx,
    setTx,
}: TransferProgressProps) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();
    const [txStatusToShow, setTxStatusToShow] = useState<TransactionStatusEnum>(tx.status);
    const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);

    const fetchTx = useCallback(async () => {
       try {
        // TODO nick - add link to actual api here
        // const response = await fetch('http://127.0.0.1/txstatus/primeToNexus/' + tx.sourceTxHash) as unknown as BridgeTransactionDto

        let apiUrl;
        if(chain === ChainEnum.Prime && destinationChain === ChainEnum.Nexus){
            apiUrl = `https://developers.apexfusion.org/api/txStatus/primeToNexus/${tx.sourceTxHash}`;
        } else if(chain === ChainEnum.Nexus && destinationChain === ChainEnum.Prime){
            apiUrl = `https://developers.apexfusion.org/api/txStatus/nexusToPrime/${tx.sourceTxHash}`;
        }
        
        if(!apiUrl){
            return console.error('Unable to query for tx status - Not a fallback path.')
        }

        const res = await fetch(apiUrl);
        // const res = await fetch('https://api.npoint.io/00f76d974a3df3f7e3ba')

        const response = await res.json() as unknown as BridgeTransactionDto

        // const response = { status: TransactionStatusEnum.ExecutedOnDestination}

        if (response) {
            const status = response.status
            const newTx = Object.assign({},tx);
            newTx.status = status; // this will be the new status
            console.log(status)

            setTx(newTx);
            setTxStatusToShow(
                (prev) => {
                    if (prev === TransactionStatusEnum.SubmittedToDestination &&
                        (status === TransactionStatusEnum.IncludedInBatch ||
                        status === TransactionStatusEnum.FailedToExecuteOnDestination)) {
                        // this happens on bridge sometimes, so to prevent user confusion, we ignore it
                        return prev;
                    }
    
                    return status
                }
            );
        }
        return response;
       } catch(e){
        console.log(e)
       }


    }, [tx.id, fetchFunction, dispatch, setTx])

    const transferProgress = (function(txStatus: TransactionStatusEnum){
        switch (txStatus) {
            case TransactionStatusEnum.ExecutedOnDestination: return TRANSFER_PROGRESS_TEXT.DONE;
            case TransactionStatusEnum.InvalidRequest: return TRANSFER_PROGRESS_TEXT.ERROR;
            default: return TRANSFER_PROGRESS_TEXT.IN_PROGRESS;
        }
    })(txStatusToShow)

	useEffect(() => {
		fetchTx();

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
        const defaultSteps = getDefaultSteps(tx.originChain, tx.destinationChain)
        return defaultSteps.map(dStep => {
            const text = getStepText(dStep.number, tx.originChain, tx.destinationChain);
            const status = getStepStatus(dStep.number, txStatusToShow);
            return {
                ...dStep,
                text,
                status,
            }
        })
    }, [tx.destinationChain, tx.originChain, txStatusToShow])

    const onOpenExplorer = () => openExplorer(tx);
    return (
        <Box>
            <Typography variant='h3' fontSize="14px" fontWeight={600} sx={{color:'white',mt:4, mb:2, textAlign:'center', textTransform:'uppercase'}}>
                {transferProgress}

                {transferProgress !== TRANSFER_PROGRESS_TEXT.DONE && transferProgress !== TRANSFER_PROGRESS_TEXT.ERROR &&
                    <CircularProgress sx={{ marginLeft: 2, color:'white', position:'relative',top:'5px' }} size={22}/>
                }
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