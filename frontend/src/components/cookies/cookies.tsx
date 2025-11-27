import React, { useEffect, useState } from 'react';
import { Box, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
	initSentryFull,
	getCookieConsent,
	setCookieConsent,
	COOKIE_CONSENT_ACCEPTED,
	COOKIE_CONSENT_REJECTED,
} from '../sentry/sentry';

export default function CookieConsent() {
	const [visible, setVisible] = useState(false);

	// Check if the consent cookie already exists
	useEffect(() => {
		if (getCookieConsent() === null) setVisible(true);
	}, []);

	const acceptCookies = () => {
		setVisible(false);
		setCookieConsent(COOKIE_CONSENT_ACCEPTED);

		initSentryFull();
	};

	const rejectCookies = () => {
		setVisible(false);
		setCookieConsent(COOKIE_CONSENT_REJECTED);
	};

	if (!visible) return null;

	return (
		<Box sx={styles.container}>
			<Box sx={styles.banner}>
				<p>
					We use cookies and similar technologies to analyze website
					traffic, improve your browsing experience, and understand
					where our visitors come from. By clicking "Accept", you
					consent to the use of analytics and tracking cookies. You
					can withdraw your consent at any time in your browser
					settings. For more details, please read our{' '}
					<Link
						component={RouterLink}
						to="/privacy-policy"
						sx={{ color: 'inherit', textDecoration: 'none' }}
					>
						Privacy Policy
					</Link>
				</p>
				<Button onClick={acceptCookies} style={styles.button}>
					Accept
				</Button>
				<Button onClick={rejectCookies} style={styles.buttonReject}>
					Reject
				</Button>
			</Box>
		</Box>
	);
}

const styles = {
	container: {
		position: 'fixed',
		bottom: 0,
		left: 0,
		width: '100%',
		backgroundColor: 'rgba(0,0,0,0.8)',
		color: 'white',
		display: 'flex',
		justifyContent: 'center',
		padding: '16px',
		zIndex: 1000,
	},
	banner: {
		maxWidth: '600px',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: '16px',
	},
	button: {
		backgroundColor: '#4caf50',
		border: 'none',
		color: 'white',
		padding: '12px 48px',
		borderRadius: '4px',
		cursor: 'pointer',
	},
	buttonReject: {
		backgroundColor: '#424442ff',
		border: 'none',
		color: 'white',
		padding: '12px 48px',
		borderRadius: '4px',
		cursor: 'pointer',
	},
};
