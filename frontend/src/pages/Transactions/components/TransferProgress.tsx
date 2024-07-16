import { Box, Typography } from "@mui/material"

const STATUS = {
    WAITING:'WAITING',
    IN_PROGRESS:'IN_PROGRESS',
    DONE:'DONE',
    ERROR:'ERROR',
}

type Step = {
    text: string,
    status:string
}


const TransferStep = ({
    step
}:{
    step:Step
})=>{
    return (
        <Box sx={{textAlign:'center'}}>
            <Typography sx={{color:'white'}}>{step.text}</Typography>
        </Box>
    )
}

const steps:Step[] = [
    {
        text:'Your address on the Prime Chain sends assets to the Bridge Wallet.',
        status:STATUS.WAITING
    },
    {
        text:'There is a blockchain of the bridge that facilitates the transaction.',
        status:STATUS.WAITING
    },
    {
        text:'The assets goes from the Bridge Wallet to the address on the Vector Chain.',
        status:STATUS.WAITING
    },
]

const TransferProgress = () => {
  return (
    <Box sx={{
        display:'flex',
        justifyContent:"space-between",
        gap:'40px'
    }}>
        {steps.map(step=> <TransferStep step={step}/>)}
    </Box>
  )
}

export default TransferProgress