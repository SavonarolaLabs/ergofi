import {
	type ExplorerAssetString,
	type ExplorerOutputString,
	type ExplorerOutputStringCustom
} from './getOracleBox';
import { TOKEN_SIGRSV, TOKEN_SIGUSD } from './api/ergoNode';

export type OracleBoxesData = {
	inErg: bigint;
	inSigUSD: bigint;
	inSigRSV: bigint;
	inCircSigUSD: bigint;
	inCircSigRSV: bigint;
	oraclePrice: bigint;
	newBankBox: ExplorerOutputStringCustom;
	oracleBox: ExplorerOutputString;
};

const FEE = 200n;
const FEE_DENOM = 10_000n;

// Измененная функция calculateSigUsdRateWithFee, теперь возвращает также fee
export function calculateSigUsdRateWithFee(
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

	const bcDeltaExpected = scNominalPrice * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);

	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee);

	return { rateSCERG, fee, bcDeltaExpectedWithFee };
}

// Измененная функция calculateSigRsvRateWithFee, теперь возвращает также fee
export function calculateSigRsvRateWithFee(
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
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { rateRSVERG, fee, bcDeltaExpectedWithFee };
}

// Новая функция для SigUSD, принимающая Total на вход
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

	const feeMultiplierNumerator = FEE_DENOM + direction * FEE;
	const feeMultiplierDenominator = FEE_DENOM;

	const bcDeltaExpected = (ergRequest * feeMultiplierDenominator) / feeMultiplierNumerator;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);
	const requestSC = bcDeltaExpected / scNominalPrice;

	const rateSCERG = Number(requestSC) / Number(ergRequest);
	return { rateSCERG, fee, requestSC };
}

export function calculateSigUsdRateWithFeeReversed(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestErg: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint; requestSC: bigint } {
	let rateSCERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	//console.log(oraclePrice, ' +Reserve BC:', bcReserveNeededIn);
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

	// STEP 1 -> -FEE
	//const requestErg = 1n; // <-------- INITIAL
	const bcDeltaExpected = (requestErg * FEE_DENOM) / (FEE_DENOM + direction * FEE);
	// STEP 2 -> requestSC
	const requestSC = bcDeltaExpected / scNominalPrice;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);

	rateSCERG = Number(requestSC) / Number(requestErg);
	// console.log('                          ');
	// console.log('----------FINAL-----------');
	// console.log('🚀 ~ rateSCERG:', rateSCERG);
	// console.log('                          ');
	return { rateSCERG, fee, requestSC }; //cents for nanoerg
}

// Новая функция для SigRSV, принимающая Total на вход
export function calculateSigRsvRateWithFeeFromErg(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	ergRequest: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint; requestRSV: bigint } {
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergs
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV; // nanoergs per RSV

	const feeMultiplierNumerator = FEE_DENOM + direction * FEE;
	const feeMultiplierDenominator = FEE_DENOM;

	const bcDeltaExpected = (ergRequest * feeMultiplierDenominator) / feeMultiplierNumerator;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);
	const requestRSV = bcDeltaExpected / equityRate;

	const rateRSVERG = Number(requestRSV) / Number(ergRequest);

	return { rateRSVERG, fee, requestRSV };
}

// Вспомогательные функции
function minBigInt(...args: bigint[]) {
	return args.reduce((min, current) => (current < min ? current : min));
}
function maxBigInt(...args: bigint[]) {
	return args.reduce((max, current) => (current > max ? current : max));
}
function absBigInt(arg: bigint) {
	return arg >= 0n ? arg : -arg;
}

export function extractBoxesData(oracleBox: ExplorerOutputString, bankBox: ExplorerOutputString) {
	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);

	const inSigUSD = BigInt(
		bankBox.assets.find((asset: ExplorerAssetString) => asset.tokenId == TOKEN_SIGUSD)!.amount
	);
	console.log('🚀 ~ inSigUSD:', inSigUSD);

	const inSigRSV = BigInt(
		bankBox.assets.find((asset: ExplorerAssetString) => asset.tokenId == TOKEN_SIGRSV)!.amount
	);
	console.log('🚀 ~ inSigRSV:', inSigRSV);

	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);

	let newBankBox: ExplorerOutputStringCustom = JSON.parse(JSON.stringify(bankBox));
	newBankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	newBankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	// ORACLE PRICE / 100n
	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n; // nanoerg for cent
	console.log('🚀 ~ oraclePrice:', oraclePrice);

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		bankBox: newBankBox,
		oracleBox
	};
}

function calculateOutputRsv(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestRSV: bigint,
	rateWithFee: number,
	direction: bigint
) {
	const requestErg = BigInt(Math.floor(Number(requestRSV) / rateWithFee));
	console.log('🚀 ~ requestErg:', requestErg);
	console.log('🚀 ~ requestRSV:', requestRSV);

	const outErg = inErg + direction * requestErg;
	console.log('🚀 ~ inErg:', inErg);
	console.log('🚀 ~ outErg:', outErg);

	const outSigRSV = inSigRSV - direction * requestRSV;
	console.log('🚀 ~ outSigRSV:', outSigRSV);

	const outCircSigRSV = inCircSigRSV + direction * requestRSV;
	console.log('🚀 ~ outCircSigRSV:', outCircSigRSV);

	const outSigUSD = inSigUSD;
	const outCircSigUSD = inCircSigUSD;

	return {
		requestErg,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	};
}

function calculateOutputSc(
	inErg: bigint,
	inSigUSD: bigint,
	inSigRSV: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	requestSC: bigint,
	rateWithFee: number,
	direction: bigint
) {
	const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); // nanoerg
	console.log('---------EXCHANGE----------');
	console.log('🚀 ~ requestErg:', requestErg, ' | nanoergs');
	console.log('🚀 ~ requestSC:', requestSC, ' | cents');
	console.log('                          ');

	// Bank out
	const outErg = inErg + requestErg * direction; //
	console.log('inErg:', inErg, ' + requestErg:', requestErg, ' = outErg:', outErg);

	const outSigUSD = inSigUSD - requestSC * direction; //
	console.log('inSigUSD:', inSigUSD, ' -requestSC:', requestSC, ' = outSigUSD:', outSigUSD);

	const outCircSigUSD = inCircSigUSD + requestSC * direction;
	console.log('🚀 ~ outCircSigUSD:', outCircSigUSD);

	const outSigRSV = inSigRSV;
	const outCircSigRSV = inCircSigRSV;

	return {
		requestErg,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	};
}
