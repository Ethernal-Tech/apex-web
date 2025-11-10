import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import './index.css';
import './landing.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'react-toastify/dist/ReactToastify.css';

import AppContainer from './containers/AppContainer';
import { ToastContainer } from 'react-toastify';
import * as Sentry from '@sentry/react';

Sentry.init({
	dsn: 'https://bf7c682b341edcc67fbec7597e25791f@o4510034117722112.ingest.de.sentry.io/4510046234345552',
	beforeSend(event) {
		// Strip any potentially personal info
		delete event.user;
		delete event.request;
		delete event.extra;
		return event;
	},

	// Adds request headers and IP for users.
	sendDefaultPii: false,
	integrations: [],

	// Enable logs to be sent to Sentry
	enableLogs: false,

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for tracing.
	tracesSampleRate: 0.0,

	// Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
	//   tracePropagationTargets: [/^\//, /^https:\/\/yourserver\.io\/api/], // TODO: change to correct url
	tracePropagationTargets: ['localhost', /^\/\//],

	// Capture Replay for 10% of all sessions,
	// plus for 100% of sessions with an error
	replaysSessionSampleRate: 0.0,
	replaysOnErrorSampleRate: 0.0,
});

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement,
);

root.render(
	<React.StrictMode>
		<AppContainer />
		<ToastContainer />
	</React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
