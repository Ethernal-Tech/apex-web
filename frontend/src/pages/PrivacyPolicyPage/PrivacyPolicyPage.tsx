import React from 'react';
import BasePage from '../base/BasePage';
import { Box } from '@mui/material';
import { privacyPolicyHtml } from './data/PrivacyPolicyPage.data';
import { privacyPolicySkylineHtml } from './data/PrivacyPolicyPageSkyline.data';
import appSettings from '../../settings/appSettings';

const PrivacyPolicyPage: React.FC = () => {
	return (
		<BasePage>
			<Box
				sx={{
					color: 'white',
					paddingBottom: '20px',
				}}
				dangerouslySetInnerHTML={{
					__html: appSettings.isSkyline
						? privacyPolicySkylineHtml
						: privacyPolicyHtml,
				}}
			/>
		</BasePage>
	);
};

export default PrivacyPolicyPage;
