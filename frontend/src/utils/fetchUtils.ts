import { toast } from 'react-toastify';
import { ApiException } from '../swagger/apexBridgeApiService';
import * as Sentry from '@sentry/react';

export class ErrorResponse {
	err: string;

	constructor({ err }: { err: string }) {
		this.err = err;
	}
}

const toErrResponse = (error: any): ErrorResponse => {
	try {
		const apiException = error as ApiException;
		if (apiException?.response) {
			try {
				const parsed = JSON.parse(apiException?.response);
				const inner = parsed.message || parsed.err || parsed.error;
				if (inner) {
					return new ErrorResponse({ err: `${inner}` });
				}
			} catch (e) {
				console.log('Failed to parse apiException.response', e);
				Sentry.captureException(e, {
					tags: {
						component: 'fetchUtils.ts',
						action: 'toErrResponse',
					},
				});
			}

			return new ErrorResponse({ err: `${apiException.response}` });
		} else if (apiException?.result) {
			return new ErrorResponse({ err: `${apiException.result}` });
		}
	} catch (e) {
		console.log('Error occurred while creating err response', e);
		Sentry.captureException(e, {
			tags: {
				component: 'fetchUtils.ts',
				action: 'toErrResponse',
			},
		});
	}

	return new ErrorResponse({ err: `${error}` });
};

export const catchError = (error: any, showUIError = true): ErrorResponse => {
	// server error
	if (error.status === 500) {
		const err = 'Unknown server error, please contact system administrator';
		showUIError && toast.error(err);
		return toErrResponse(err);
	}

	// validation error
	if (error.status === 400) {
		showUIError &&
			toast.error(
				'There are some validation errors, please fix those and try again.',
			);
		return toErrResponse(error);
	}

	// forbidden, there is no permission for this user or action is not possible (example: cannot delete entity that is used)
	if (error.status === 403) {
		const err = "You don't have permission to perform this action";
		showUIError && toast.error(err);
		return toErrResponse(err);
	}

	// unauthorized error
	if (error.status === 401) {
		const err = 'You are unauthorized for this action.';
		showUIError && toast.error(err);
		return toErrResponse(err);
	}

	if (error instanceof TypeError) {
		// INFO: this is not useful to user, it is more for us to see the message
		const err = error.toString();
		showUIError && toast.error(err);
		return toErrResponse(err);
	}

	const err = 'Unknown error, please contact system administrator';
	showUIError && toast.error(err);
	return toErrResponse(err);
};

export const tryCatchJsonByAction = async <P>(
	fetchFunction: (...args: any[]) => Promise<P>,
	showUIError = true,
): Promise<P | ErrorResponse> => {
	const fetchPromise = fetchFunction();

	try {
		const response = await fetchPromise;
		return response;
	} catch (error: any) {
		return catchError(error, showUIError);
	}
};
