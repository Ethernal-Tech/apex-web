import * as Sentry from '@sentry/react';
import appSettings from '../settings/appSettings';
import { getCookieConsent } from './cookies';

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

export function captureAndThrowError(
	message: string | Error,
	component: string,
	action: string,
): never {
	const err = message instanceof Error ? message : new Error(String(message));

	captureException(err, {
		tags: {
			component: component,
			action: action,
		},
	});

	throw err;
}
