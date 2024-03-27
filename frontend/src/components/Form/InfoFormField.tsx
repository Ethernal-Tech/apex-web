import { Box, Typography } from "@mui/material"
import FieldBase from "./FieldBase"

type Props = {
    label: string
    value: string | number
}

function InfoFormField({ label, value }: Props) {
    return (
        <FieldBase label={label}>
            <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', marginTop: '2px' }}>
                <Typography>{value}</Typography>
            </Box>
        </FieldBase>
    )
}

export default InfoFormField;