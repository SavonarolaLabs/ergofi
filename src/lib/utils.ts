import BigNumber from 'bignumber.js';

export function ergStringToNanoErgBigInt(erg: string): bigint {
	return BigInt(BigNumber(erg).multipliedBy(1_000_000_000).toString());
}

export function usdStringToCentBigInt(usd: string): bigint {
	return BigInt(BigNumber(usd).multipliedBy(100).toString());
}
