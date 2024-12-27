import BigNumber from 'bignumber.js';

export function ergStringToNanoErgBigInt(erg: string): bigint {
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

export function nanoErgToErg(erg: bigint | undefined): string {
	if (typeof erg == 'bigint') {
		return (Number(erg) / 10 ** 9).toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
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
