const COOKIE_CONSENT_KEY = 'cookie_consent';

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

export const getCookieConsent = (): boolean => !!checkCookieConsent()?.accepted;

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
