import { parse } from '@fleet-sdk/serializer';
import BigNumber from 'bignumber.js';
import { TOKEN_BANK_NFT, type MempoolTransaction, type Output } from './api/ergoNode';
import { ErgoAddress } from '@fleet-sdk/core';
import { formatDistanceToNowStrict } from 'date-fns';
import numeral from 'numeral';

export function ergStringToNanoErg(erg: string): bigint {
	return BigInt(BigNumber(erg).multipliedBy(1_000_000_000).toString());
}

export function usdStringToCentBigInt(usd: string): bigint {
	return BigInt(BigNumber(usd).multipliedBy(100).toString());
}

export function minBigInt(...args: bigint[]): bigint {
	return args.reduce((min, current) => (current < min ? current : min));
}
export function maxBigInt(...args: bigint[]): bigint {
	return args.reduce((max, current) => (current > max ? current : max));
}
export function absBigInt(arg: bigint): bigint {
	return arg >= 0n ? arg : -arg;
}

export function nanoErgToErg(erg: bigint | undefined, maxDigits = 2): string {
	if (typeof erg == 'bigint') {
		return (Number(erg) / 10 ** 9).toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: maxDigits
		});
	} else {
		return '0.00';
	}
}

export function centsToUsd(erg: bigint | undefined): string {
	if (typeof erg == 'bigint') {
		return (Number(erg) / 10 ** 2).toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		});
	} else {
		return '0.00';
	}
}

export function oracleRateToUsd(rate: bigint): string {
	return (10 ** 7 / Number(rate)).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

export function parseBigInt(register: string): bigint {
	const parsed = parse<number>(register);
	return BigInt(parsed);
}

export function getBankBoxOutput(tx: MempoolTransaction): Output | undefined {
	return tx.outputs.find((output) =>
		output.assets.some((asset) => asset.tokenId === TOKEN_BANK_NFT)
	);
}

export function isOwnTx(tx: MempoolTransaction, ownAddressList: string[]): boolean {
	if (ownAddressList.length == 0) return false;
	const trees = ownAddressList.map((a: string) => ErgoAddress.fromBase58(a).ergoTree);

	return tx.outputs.some((i) => trees.includes(i.ergoTree));
}

export function formatTimeAgo(timestamp: number): string {
	const t = formatDistanceToNowStrict(new Date(timestamp));
	return (
		t
			.replace(/ hours?/, 'h')
			.replace(/ minutes?/, 'm')
			.replace(/ days?/, 'd')
			.replace(/ seconds?/, 's') + ' ago'
	);
}

export function formatAmount(
	input: bigint | number | undefined,
	showPrefix: boolean = true
): string {
	// Handle missing/undefined
	if (input == null) return '0';

	// Convert bigint to number if needed
	let value = typeof input === 'bigint' ? Number(input) : input;

	// Determine prefix
	const prefix = value > 0 && showPrefix ? '+' : '';

	// Decide if we are abbreviating, and compute the "base" value for formatting
	let suffix = '';
	let base = value; // this is the number we pass to Numeral
	const absValue = Math.abs(value);

	if (absValue >= 1_000_000_000_000) {
		base = value / 1_000_000_000_000;
		suffix = 'T';
	} else if (absValue >= 1_000_000_000) {
		base = value / 1_000_000_000;
		suffix = 'B';
	} else if (absValue >= 1_000_000) {
		base = value / 1_000_000;
		suffix = 'M';
	} else if (absValue >= 1000) {
		base = value / 1000;
		suffix = 'k';
	}

	// Determine how many decimals to show: if < 3 digits, use 2 decimals; else 1
	const absIntegerPart = Math.floor(Math.abs(base));
	const formatString = absIntegerPart < 100 ? '0.00' : '0.0';

	// Format using Numeral
	let formatted = numeral(base).format(formatString);

	// Remove trailing ".0" if it exists
	if (formatted.endsWith('.0')) {
		formatted = formatted.slice(0, -2);
	}

	// Return the final string
	return prefix + formatted + suffix;
}
