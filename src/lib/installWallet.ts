export function getWalletInstallLink(): string {
	const userAgent = navigator.userAgent.toLowerCase();
	if (
		(userAgent.includes('chrome') ||
			userAgent.includes('chromium') ||
			userAgent.includes('brave')) &&
		!userAgent.includes('edge') &&
		!userAgent.includes('opera')
	) {
		return 'https://chromewebstore.google.com/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai';
	}
	return 'https://addons.mozilla.org/en-US/firefox/addon/nautilus/';
}
