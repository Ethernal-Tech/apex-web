import * as Sentry from '@sentry/react';
import appSettings from '../../settings/appSettings';

const COOKIE_CONSENT_KEY = 'cookieConsent';

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
	if (appSettings.disableSentry) {
		return;
	}

	if (getCookieConsent()) {
		initSentryFull();
	} else {
		Sentry.init(restrictedConfig);
	}
}

async function initSentryFull() {
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

interface CookieConsent {
	accepted: boolean;
	expiry: string;
}

const checkCookieConsent = (): CookieConsent | undefined => {
	const cookieConsentRaw = localStorage.getItem(COOKIE_CONSENT_KEY);
	if (!cookieConsentRaw) {
		return;
	}

	const cookieConsent = JSON.parse(cookieConsentRaw) as CookieConsent;
	const expiry = new Date(cookieConsent.expiry);
	if (expiry < new Date()) {
		localStorage.removeItem(COOKIE_CONSENT_KEY);
		return;
	}

	return cookieConsent;
};

const getCookieConsent = (): boolean => !!checkCookieConsent()?.accepted;

export const shouldShowCookieBanner = (): boolean => !checkCookieConsent();

export const setCookieConsent = (accepted: boolean) => {
	const expiry = new Date();
	expiry.setFullYear(expiry.getFullYear() + 1);

	localStorage.setItem(
		COOKIE_CONSENT_KEY,
		JSON.stringify({
			accepted,
			expiry: expiry.toISOString(),
		} as CookieConsent),
	);
};
