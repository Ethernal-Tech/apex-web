import { Card, CardContent, CardHeader } from '@mui/material';
import BasePage from '../base/BasePage';
import TextFormField from '../../components/Form/TextFormField';

function NewTransactionPage() {
	
	return (
		<BasePage>
			<>
				<Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%' }}>
					<CardHeader title="Source" sx={{ padding: '16px 16px 0px 16px' }} />
					<CardContent sx={{ padding: '0px 16px 16px 16px' }}>
						<TextFormField label='Address' disabled value='// TODO:' />
					</CardContent>
				</Card>
			</>
		</BasePage>
	)
}

export default NewTransactionPage;