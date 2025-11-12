import React from 'react';
import BasePage from '../base/BasePage';
import { Box } from '@mui/material';
import { termsOfServiceHtml } from './data/TermsOfServicePage.data';
import { termsOfServiceSkylineHtml } from './data/TermsOfServicePageSkyline.data';
import appSettings from '../../settings/appSettings';

const TermsOfServicePage: React.FC = () => {
	return (
		<BasePage>
			<Box
				sx={{
					color: 'white',
					paddingBottom: '20px',
				}}
				dangerouslySetInnerHTML={{
					__html: appSettings.isSkyline
						? termsOfServiceSkylineHtml
						: termsOfServiceHtml,
				}}
			/>
		</BasePage>
	);
};

export default TermsOfServicePage;
