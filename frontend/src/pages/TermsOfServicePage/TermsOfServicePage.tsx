import React from 'react';
import BasePage from '../base/BasePage';
import { Box } from '@mui/material';
import { termsOfServiceHtml } from './data/TermsOfServicePage.data';

const TermsOfServicePage: React.FC = () => {
	return (
		<BasePage>
			<Box
				sx={{ color: 'white' }}
				dangerouslySetInnerHTML={{ __html: termsOfServiceHtml }}
			/>
		</BasePage>
	);
};

export default TermsOfServicePage;
