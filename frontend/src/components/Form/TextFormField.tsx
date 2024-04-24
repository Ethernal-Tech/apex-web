import { TextField } from "@mui/material"
import FieldBase from "./FieldBase"

type Props = {
    label: string
    error?: string
    value: string | number
    onValueChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> | undefined
    multiline?: boolean
    disabled?: boolean
}

function TextFormField({ label, error, value, onValueChange, multiline, disabled }: Props) {
    return (
        <FieldBase label={label} error={error}>
            <TextField
                disabled={disabled}
                multiline={multiline}
                rows={2}
                error={!!error}
                variant="outlined"
                type="text"
                value={value}
                onChange={onValueChange}
                inputProps={{
                    style: { padding: '12px 14px' }
                }}
            />
        </FieldBase>
    )
}

export default TextFormField;