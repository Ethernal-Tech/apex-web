import * as Sentry from '@sentry/react';
import appSettings from '../../settings/appSettings';

const COOKIE_CONSENT_KEY = 'cookieConsent';
export const COOKIE_CONSENT_ACCEPTED = 'accepted';
export const COOKIE_CONSENT_REJECTED = 'rejected';

const fullConfig = {
	dsn: appSettings.sentryDsn,
	sendDefaultPii: true,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
		}),
	],
	enableLogs: true,
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^\/\//], // TODO: change to correct url
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
};

const restrictedConfig = {
	dsn: appSettings.sentryDsn,
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
	if (getCookieConsent() === true) {
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

export const getCookieConsent = (): boolean | null => {
	const cookieConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
	if (cookieConsent === null) {
		return cookieConsent;
	}

	return (cookieConsent as string) === COOKIE_CONSENT_ACCEPTED;
};

export const setCookieConsent = (decision: string) => {
	localStorage.setItem(COOKIE_CONSENT_KEY, decision);
};
