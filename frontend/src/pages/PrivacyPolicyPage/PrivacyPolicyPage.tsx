import React from 'react';
import BasePage from '../base/BasePage';
import { Box } from '@mui/material';
import { privacyPolicyHtml } from './data/PrivacyPolicyPage.data';

const PrivacyPolicyPage: React.FC = () => {
	return (
		<BasePage>
			<Box
				sx={{
					color: 'white',
					height: '100vh',
					overflowY: 'scroll',
					paddingBottom: '80px',
				}}
				dangerouslySetInnerHTML={{ __html: privacyPolicyHtml }}
			/>
		</BasePage>
	);
};

export default PrivacyPolicyPage;
