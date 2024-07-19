import { toast } from 'react-toastify';
import { ApiException } from '../swagger/apexBridgeApiService';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch, UnknownAction } from 'redux';
import { logout } from '../actions/logout';

export const catchError = (error: any, dispatch: Dispatch<UnknownAction>) => {
	// server error
	if (error.status === 500) {
		toast.error('Unknown server error, please contact system administrator');
		return null;
	}

	// validation error
	if (error.status === 400) {
		toast.error('There are some validation errors, please fix those and try again.')
		// error.result is BaseResponseModel all the time (if backend is correctly implemented)
		return (error as ApiException).result;
	}

	// forbidden, there is no permission for this user or action is not possible (example: cannot delete entity that is used)
	if (error.status === 403) {
		// error.result is BaseResponseModel all the time (if backend is correctly implemented)
		const result = (error as ApiException).result;
		toast.error('You don\'t have permission to perform this action');
		return result;
	}

	// unauthorized error
	if (error.status === 401) {
		logout(dispatch);

		toast.error('You are unauthorized for this action. Please login to application and try this action again. If problem remains, please contact system administrator.');
		return null
	}

	if (error instanceof TypeError) {
		// INFO: this is not useful to user, it is more for us to see the message
		toast.error(error.toString());
		return null
	}

	toast.error('Unknown error, please contact system administrator');
	return null;
}

export const tryCatchJsonByAction = async <P>(fetchFunction: (...args: any[]) => Promise<P>, dispatch: Dispatch<UnknownAction>): Promise<P> => {
	const fetchPromise = fetchFunction();

	try {
		const response = await fetchPromise;
		return response;
	}
	catch (error: any) {
		return catchError(error, dispatch);
	}
}

export const useTryCatchJsonByAction = () => {
	const dispatch = useDispatch();
	
	return useCallback(
		<P>(fetchFunction: (...args: any[]) => Promise<P>) => {
			return tryCatchJsonByAction(fetchFunction, dispatch);
		},
		[dispatch]
	)
}
