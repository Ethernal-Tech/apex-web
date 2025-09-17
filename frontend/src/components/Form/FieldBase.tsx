import { FormControl, FormLabel, Typography } from '@mui/material';

type Props = {
	label: string;
	children: any;
	error?: string;
};

function FieldBase({ label, children, error }: Props) {
	return (
		<FormControl
			sx={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				margin: '20px 20px 0px 20px',
			}}
		>
			<FormLabel sx={{ minWidth: '100px', marginRight: '20px' }}>
				{label}
			</FormLabel>
			<FormControl
				error={!!error}
				sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}
			>
				{children}
				{!!error && (
					<Typography sx={{ color: 'red', fontSize: 'medium' }}>
						{error}
					</Typography>
				)}
			</FormControl>
		</FormControl>
	);
}

export default FieldBase;
