import * as Sentry from '@sentry/react';

const DSN =
	'https://bf7c682b341edcc67fbec7597e25791f@o4510034117722112.ingest.de.sentry.io/4510046234345552'; // TODO: Change with production DSN

const fullConfig = {
	dsn: DSN,
	sendDefaultPii: true,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	enableLogs: true,
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^\/\//], // TODO: change to correct url
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
};

const restrictedConfig = {
	dsn: DSN,
	beforeSend(event: any) {
		// Strip any potentially personal info
		delete event.user;
		delete event.request;
		delete event.extra;
		return event;
	},

	sendDefaultPii: false,
	enableLogs: false,
};

export function InitSentry() {
	const cookies = document.cookie.split(';').map((c) => c.trim());
	if (cookies && cookies.some((c) => c.startsWith('cookieConsent=true'))) {
		initSentryFull();
	} else {
		Sentry.init(restrictedConfig);
	}
}

export async function initSentryFull() {
	const client = Sentry.getClient();
	if (client !== undefined) {
		// Close the old client cleanly
		await client.close();
	}

	// Now re-init with new options
	Sentry.init(fullConfig);
}

export function captureException(err: any, context: any = {}) {
	Sentry.captureException(err, {
		tags: context,
	});
}
