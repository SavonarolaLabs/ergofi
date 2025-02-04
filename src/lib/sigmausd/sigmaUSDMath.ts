import type { Direction } from './sigmaUSDAndDexy';
import { absBigInt, maxBigInt, minBigInt } from '../utils';

const FEE_BANK = 200n; //2%
const FEE_BANK_DENOM = 10_000n;

// BankRate - SigmaUSD Math
export function calculateBankRateUSDInputUSD(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestSC: bigint,
	direction: Direction
): { contractRate: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let contractRate: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	// Stable PART --------

	const bcDeltaExpected = scNominalPrice * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	contractRate = Number(requestSC) / Number(bcDeltaExpectedWithFee);

	return { contractRate, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateUSDInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: Direction
): { contractRate: number; fee: bigint; requestSC: bigint } {
	let contractRate: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	// Stable PART --------

	const requestSC =
		(requestErg * FEE_BANK_DENOM) / (scNominalPrice * (FEE_BANK_DENOM + FEE_BANK * direction));
	const bcDeltaExpected = scNominalPrice * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	contractRate = Number(requestSC) / Number(requestErg);

	return { contractRate, fee, requestSC }; //cents for nanoerg
}
export function calculateBankRateRSVInputRSV(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestRSV: bigint,
	direction: Direction
): { contractRate: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let contractRate: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	// Stable PART --------

	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	contractRate = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { contractRate, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateRSVInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: Direction
): { contractRate: number; fee: bigint; requestRSV: bigint } {
	let contractRate: number;
	// Stable PART --------
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	// Stable PART --------

	const requestRSV =
		(requestErg * FEE_BANK_DENOM) / (equityRate * (FEE_BANK_DENOM + FEE_BANK * direction));
	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	contractRate = Number(requestRSV) / Number(requestErg);

	return { contractRate, fee, requestRSV };
}
