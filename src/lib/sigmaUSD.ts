import BigNumber from 'bignumber.js';
import { decodeBigInt, TOKEN_SIGRSV, TOKEN_SIGUSD, type Asset, type Output } from './api/ergoNode';
import { absBigInt, maxBigInt, minBigInt } from './utils';

export type OracleBoxesData = {
	inErg: bigint;
	inSigUSD: bigint;
	inSigRSV: bigint;
	inCircSigUSD: bigint;
	inCircSigRSV: bigint;
	oraclePrice: bigint;
	bankBox: Output;
	oracleBox: Output;
};

const FEE_BANK = 200n; //2%
const FEE_BANK_DENOM = 10_000n;

export const FEE_UI = 10n; //0.1%
export const FEE_UI_DENOM = 100_00n;

// SigUSD
export function calculateBankRateUSDInputUSD(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestSC: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateSCERG: number;

	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

	const bcDeltaExpected = scNominalPrice * requestSC; // TO CHANGE
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);

	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee); // X

	return { rateSCERG, fee, bcDeltaExpectedWithFee };
}
export function calculateBankRateUSDInputERG(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; requestSC: bigint } {
	//------------- STABLE PART ---------------
	let rateSCERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent
	const requestSC =
		(requestErg * FEE_BANK_DENOM) / (scNominalPrice * (FEE_BANK_DENOM + FEE_BANK * direction));

	// 2 more params
	const bcDeltaExpected = scNominalPrice * requestSC; // TO CHANGE
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	rateSCERG = Number(requestSC) / Number(requestErg);

	return { rateSCERG, fee, requestSC }; //cents for nanoerg
}

// SigRSV - pause
export function calculateBankRateRSVInputRSV(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestRSV: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint; bcDeltaExpectedWithFee: bigint } {
	let rateRSVERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV
	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { rateRSVERG, fee, bcDeltaExpectedWithFee };
}

// Вспомогательные функции
export function extractBoxesData(oracleBox: Output, bankBox: Output): OracleBoxesData {
	const inErg = BigInt(bankBox.value);
	const inSigUSD = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGUSD)!.amount
	);
	const inSigRSV = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGRSV)!.amount
	);
	const inCircSigUSD = decodeBigInt(bankBox.additionalRegisters.R4);
	const inCircSigRSV = decodeBigInt(bankBox.additionalRegisters.R5);
	// ORACLE PRICE / 100n
	const oraclePrice = decodeBigInt(oracleBox.additionalRegisters.R4) / 100n; // nanoerg for cent

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox,
		oracleBox
	};
}

export function calculateOutputSc(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestSC: bigint,
	requestErg: bigint,
	direction: bigint
): {
	outErg: bigint;
	outSigUSD: bigint;
	outSigRSV: bigint;
	outCircSigUSD: bigint;
	outCircSigRSV: bigint;
} {
	const outErg = inErg + requestErg * direction;
	const outSigUSD = inSigUSD - requestSC * direction;
	const outCircSigUSD = inCircSigUSD + requestSC * direction;
	const outSigRSV = inSigRSV;
	const outCircSigRSV = inCircSigRSV;

	return {
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	};
}

export function calculateReserveRate(bankErg: bigint, bankUSD: bigint, oraclePrice: bigint) {
	const bankERGBigNumber = BigNumber(bankErg.toString()).dividedBy(10 ** 9); //convert to ERG
	const bankUSDBigNumber = BigNumber(bankUSD.toString()).dividedBy(100); //convert to USD
	const price = BigNumber(10 ** 9)
		.dividedBy(BigNumber(oraclePrice.toString()))
		.dividedBy(100); //convert to ERG / USD price

	const reserveRate = Number(
		bankERGBigNumber.multipliedBy(price).dividedBy(bankUSDBigNumber).multipliedBy(100).toFixed(0)
	);
	return reserveRate; //%
}

// ------------- OLD -------------
export function calculateSigUsdRateWithFeeFromErg(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	ergRequest: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; requestSC: bigint } {
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

	const feeMultiplierNumerator = FEE_BANK_DENOM + direction * FEE_BANK;
	const feeMultiplierDenominator = FEE_BANK_DENOM;

	const bcDeltaExpected = (ergRequest * feeMultiplierDenominator) / feeMultiplierNumerator;
	const fee = absBigInt((bcDeltaExpected * FEE_BANK) / FEE_BANK_DENOM);
	const requestSC = bcDeltaExpected / scNominalPrice;

	const rateSCERG = Number(requestSC) / Number(ergRequest);
	return { rateSCERG, fee, requestSC };
}
