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
import * as Sentry from "@sentry/react";

Sentry.init({
	dsn: 'https://dc5c04127a9dafdd144c99a9e9e90786@o4510034117722112.ingest.de.sentry.io/4510046234345552',
	sendDefaultPii: true,
	integrations: [
		Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
		Sentry.replayIntegration(),
		Sentry.browserTracingIntegration(),
	],
	enableLogs: true,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^\/\//],
});

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);

root.render(
	<React.StrictMode>
		<AppContainer />
		<ToastContainer />
	</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
