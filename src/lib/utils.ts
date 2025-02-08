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

export function decodeBigInt(register: string): bigint {
	const parsed = parse<bigint>(register);
	return parsed;
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
	value: bigint | number | undefined,
	showPrefix: boolean = true
): string {
	if (value == undefined) return '0';
	if (typeof value == 'bigint') value = Number(value);
	const prefix = value > 0 ? '+' : '';
	if (Math.abs(value) >= 1000) {
		let formatted = numeral(value).format('0.0a').replace('m', 'M').replace('b', 'B');
		if (formatted.includes('.0')) {
			formatted = formatted.replace('.0', '');
		}
		return (showPrefix ? prefix : '') + formatted;
	}
	return (showPrefix ? prefix : '') + numeral(value).format('0.00');
}
