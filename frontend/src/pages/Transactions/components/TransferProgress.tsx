import { Box, Typography } from "@mui/material"
import {ReactComponent as Done1icon} from "../../../assets/bridge-status-icons/step-done1.svg"
import {ReactComponent as Done2icon} from "../../../assets/bridge-status-icons/step-done2.svg"
import {ReactComponent as Done3icon} from "../../../assets/bridge-status-icons/step-done3.svg"
import ButtonCustom from "../../../components/Buttons/ButtonCustom"
// import {ReactComponent as ErrorIcon} from "../../../assets/bridge-status-icons/error.svg"

const STATUS = {
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

const steps:StepType[] = [
    {
        number:1,
        text:'Your address on the Prime Chain sends assets to the Bridge Wallet.',
        status:STATUS.DONE,
        doneIcon:<Done1icon/>
    },
    {
        number:2,
        text:'There is a blockchain of the bridge that facilitates the transaction.',
        status:STATUS.ERROR,
        doneIcon:<Done2icon/>
    },
    {
        number:3,
        text:'The assets goes from the Bridge Wallet to the address on the Vector Chain.',
        status:STATUS.IN_PROGRESS,
        doneIcon:<Done3icon/>
    },
]

const TransferStep = ({step}:TransferStepProps) => {
    return (
        <Box sx={{textAlign:'center'}}>
            
            {/* waiting status */}
            {step.status === STATUS.WAITING && (
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
            
            {/* waiting status - TODO AF - finish this */}
            {step.status === STATUS.IN_PROGRESS && (
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
            
            {step.status === STATUS.DONE && (
                <Box sx={{
                    display:'inline-block',
                    width:'24px',
                    height:'24px',
                }}>
                    {step.doneIcon}
                </Box>
            )}
            
            {step.status === STATUS.ERROR && (
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

const TransferProgress = () => {
  return (
    <Box>
        <Typography sx={{color:'white',mt:4, mb:2, textAlign:'center'}}>Transfer in progress</Typography>

        <Box sx={{
            mt:4,
            display:'flex',
            justifyContent:"space-evenly",
            gap:'40px'
        }}>
            {steps.map(step=> <TransferStep key={step.number} step={step}/>)}
        </Box>

        <Box sx={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'20px',mt:4}}>
            <ButtonCustom  variant="red" sx={{ gridColumn:'span 1', textTransform:'uppercase'}}>
                View bridging history
            </ButtonCustom>
            
            <ButtonCustom  variant="white" sx={{ gridColumn:'span 1', textTransform:'uppercase' }}>
                request a refund
            </ButtonCustom>
        </Box>
    </Box>
  )
}

export default TransferProgress