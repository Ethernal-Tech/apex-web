import React, { useEffect, useState } from 'react';
import { Box, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import * as Sentry from '@sentry/react';

const fullConfig = {
	dsn: 'https://bf7c682b341edcc67fbec7597e25791f@o4510034117722112.ingest.de.sentry.io/4510046234345552',
	sendDefaultPii: true,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	enableLogs: true,
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^\/\//],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
};

const initSentryFull = () => {
	console.log('Sentry Full Init');
	const hub = (Sentry as any).getCurrentHub?.();
	const oldClient = hub?.getClient?.();

	if (oldClient) {
		// Close the old client cleanly
		oldClient.close();
		console.log('Closing');
	}

	// Now re-init with new options
	Sentry.init(fullConfig);
};

export default function CookieConsent() {
	const [visible, setVisible] = useState(false);

	// Check if the consent cookie already exists
	useEffect(() => {
		const cookies = document.cookie.split(';').map((c) => c.trim());
		const hasConsent = cookies.some((c) => c.startsWith('cookieConsent='));
		if (!hasConsent) setVisible(true);
	}, []);

	const acceptCookies = () => {
		// Set a cookie that expires in 1 year
		const expiry = new Date();
		expiry.setFullYear(expiry.getFullYear() + 1);
		document.cookie = `cookieConsent=true; expires=${expiry.toUTCString()}; path=/`;
		setVisible(false);

		initSentryFull();
	};

	const rejectCookies = () => {
		// Set a cookie that expires in 1 year
		const expiry = new Date();
		expiry.setFullYear(expiry.getFullYear() + 1);
		document.cookie = `cookieConsent=false; expires=${expiry.toUTCString()}; path=/`;
		setVisible(false);
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
		padding: '8px 16px',
		borderRadius: '4px',
		cursor: 'pointer',
	},
	buttonReject: {
		backgroundColor: '#424442ff',
		border: 'none',
		color: 'white',
		padding: '8px 16px',
		borderRadius: '4px',
		cursor: 'pointer',
	},
};
