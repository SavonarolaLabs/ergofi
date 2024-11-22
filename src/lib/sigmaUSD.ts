import {
	ErgoAddress,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SAFE_MIN_BOX_VALUE,
	SByte,
	SColl,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { getBankBox, getOracleBox } from './getOracleBox';

const TOKEN_SIGRSV = '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0'; //SigRSV
const TOKEN_SIGUSD = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'; //SigUSD
const TOKEN_BANK_NFT = '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9'; //SUSD Bank V2 NFT

const FEE = 200n;
const FEE_DENOM = 10_000n;

function calculateSigRsvRateWithFee(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePrice: bigint,
	requestRSV: bigint,
	direction: bigint
): number {
	let rateRSVERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergov
	console.log(oraclePrice, ' +Reserve BC:', bcReserveNeededIn);
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	console.log('reserve rate', inErg / bcReserveNeededIn);
	const equityIn = inErg - liabilitiesIn;
	console.log('🚀 ~ equityIn:', equityIn);
	const equityRate = equityIn / inCircSigRSV; //nano
	console.log('🚀 ~ equityRate:', equityRate);
	const bcDeltaExpected = equityRate * requestRSV;
	console.log('🚀 ~ bcDeltaExpected:', bcDeltaExpected);
	const fee = absBigInt(bcDeltaExpected * FEE) / FEE_DENOM;
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	console.log('🚀 ~ bcDeltaExpectedWithFee:', bcDeltaExpectedWithFee);
	rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);
	console.log('🚀 ~ rateRSVERG:', rateRSVERG);

	return rateRSVERG;
}

function calculateSigUsdRateWithFee(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePrice: bigint,
	requestSC: bigint,
	direction: bigint
): number {
	let rateSCERG: number;
	const bcReserveNeededIn = inCircSigUSD * oraclePrice;
	console.log(oraclePrice, ' +Reserve BC:', bcReserveNeededIn);
	const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

	const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
	const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

	console.log('----------RATES-----------');
	console.log('🚀 ~ liableRate:', liableRate);
	console.log('🚀 ~ oraclePrice:', oraclePrice);
	console.log('🚀 ~ scNominalPrice:', scNominalPrice);
	console.log('                          ');

	console.log('--------------------------');
	console.log('🚀 ~ requestSC:', requestSC);
	const bcDeltaExpected = scNominalPrice * requestSC;
	console.log('🚀 ~ bcDeltaExpected:', bcDeltaExpected);
	const fee = absBigInt(bcDeltaExpected * FEE) / FEE_DENOM;
	console.log('🚀 ~ fee:', fee);
	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	console.log('🚀 ~ bcDeltaExpectedWithFee:', bcDeltaExpectedWithFee);
	rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee);
	console.log('                          ');
	console.log('----------FINAL-----------');
	console.log('🚀 ~ rateSCERG:', rateSCERG);
	console.log('                          ');
	return rateSCERG; //cents for nanoerg
}

function minBigInt(...args: bigint[]) {
	return args.reduce((min, current) => (current < min ? current : min));
}
function maxBigInt(...args: bigint[]) {
	return args.reduce((max, current) => (current > max ? current : max));
}
function absBigInt(arg: bigint) {
	return arg > 0n ? arg : -arg;
}

async function extractBoxesData() {
	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();

	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);

	const inSigUSD = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGUSD).amount);
	console.log('🚀 ~ inSigUSD:', inSigUSD);

	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGRSV).amount);
	console.log('🚀 ~ inSigRSV:', inSigRSV);

	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	// ORACLE PRICE / 100n
	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n; // nano erg for cent
	console.log('🚀 ~ oraclePrice:', oraclePrice);

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
	const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); //nanoerg
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

export async function receiveRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	// ok

	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();

	//------------------bank-box-in---------------------
	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);
	const inSigUSD = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGUSD).amount);
	console.log('🚀 ~ inSigUSD:', inSigUSD);
	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGRSV).amount);
	console.log('🚀 ~ inSigRSV:', inSigRSV);
	//--------------------------------------------------

	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);
	const bankNFT = bankBox.assets.find((asset) => asset.tokenId == TOKEN_BANK_NFT);
	console.log('🚀 ~ bankNFT:', bankNFT);

	// ORACLE PRICE / 100n
	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n; // nano erg for cent
	console.log('🚀 ~ oraclePrice:', oraclePrice);

	function calculatePriceWithFee(
		inErg: bigint,
		inCircSigUSD: bigint,
		inCircSigRSV: bigint,
		oraclePrice: bigint,
		requestRSV: bigint
	): number {
		let rateRSVERG: number;
		const bcReserveNeededIn = inCircSigUSD * oraclePrice; // nanoergov
		console.log(oraclePrice, ' +Reserve BC:', bcReserveNeededIn);
		const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

		console.log('reserve rate', inErg / bcReserveNeededIn);
		const equityIn = inErg - liabilitiesIn;
		console.log('🚀 ~ equityIn:', equityIn);
		const equityRate = equityIn / inCircSigRSV; //nano for rsv
		console.log('🚀 ~ equityRate:', equityRate);
		const bcDeltaExpected = equityRate * requestRSV;
		console.log('🚀 ~ bcDeltaExpected:', bcDeltaExpected);
		const fee = absBigInt(bcDeltaExpected * FEE) / FEE_DENOM;
		const bcDeltaExpectedWithFee = bcDeltaExpected + fee;
		console.log('🚀 ~ bcDeltaExpectedWithFee:', bcDeltaExpectedWithFee);
		rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);
		console.log('🚀 ~ rateRSVERG:', rateRSVERG);

		return rateRSVERG;
	}

	const rateWithFee = calculatePriceWithFee(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		requestRSV
	);

	const requestErg = BigInt(Math.floor(Number(requestRSV) / rateWithFee));
	console.log('🚀 ~ requestErg:', requestErg);
	console.log('🚀 ~ requestRSV:', requestRSV);

	const outErg = inErg + requestErg;
	console.log('🚀 ~ inErg:', inErg);
	console.log('🚀 ~ outErg:', outErg);

	const outSigRSV = inSigRSV - requestRSV;
	console.log('🚀 ~ outSigRSV:', outSigRSV);

	const outCircSigRSV = inCircSigRSV + requestRSV;
	console.log('🚀 ~ outCircSigRSV:', outCircSigRSV);

	const outSigUSD = inSigUSD;
	const outCircSigUSD = inCircSigUSD;

	// ---------- OUTPUTS
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
			R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
		});

	const receiptBox = new OutputBuilder(SAFE_MIN_BOX_VALUE, myAddr)
		.addTokens({ tokenId: TOKEN_SIGRSV, amount: requestRSV })
		.setAdditionalRegisters({
			R4: SLong(BigInt(requestRSV)).toHex(), //value
			R5: SLong(BigInt(requestErg)).toHex() //nano erg
		});

	console.log(bankBox);
	console.log(oracleBox);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

export async function redeemRSVTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number
): any {
	const direction: bigint = -1n;
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	// ok

	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();
	//ok

	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);
	const inSigUSD = BigInt(
		bankBox.assets.find(
			(asset) => asset.tokenId == TOKEN_SIGUSD // to big int ----->
		).amount
	);
	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);
	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGRSV).amount);
	console.log('🚀 ~ inSigRSV:', inSigRSV);
	const bankNFT = bankBox.assets.find((asset) => asset.tokenId == TOKEN_BANK_NFT);
	console.log('🚀 ~ bankNFT:', bankNFT);

	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n;
	console.log('🚀 ~ oraclePrice:', oraclePrice);

	//calculateSigUsdRateWithFee
	const rateWithFee = calculateSigRsvRateWithFee(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		requestRSV,
		direction
	);

	const requestErg = BigInt(Math.floor(Number(requestRSV) / rateWithFee));
	console.log('🚀 ~ requestErg:', requestErg);
	console.log('🚀 ~ requestRSV:', requestRSV);

	const outErg = inErg + direction * requestErg; //
	console.log('🚀 ~ inErg:', inErg);
	console.log('🚀 ~ outErg:', outErg);

	const outSigRSV = inSigRSV - direction * requestRSV;
	console.log('🚀 ~ outSigRSV:', outSigRSV);

	const outCircSigRSV = inCircSigRSV + direction * requestRSV;
	console.log('🚀 ~ outCircSigRSV:', outCircSigRSV);

	const outSigUSD = inSigUSD;
	const outCircSigUSD = inCircSigUSD;

	// ---------- OUTPUTS
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
			R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
		});

	const receiptBox = new OutputBuilder(requestErg, myAddr).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestRSV)).toHex(), //value
		R5: SLong(BigInt(direction * requestErg)).toHex() //nano erg
	});

	console.log(bankBox);
	console.log(oracleBox);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

export async function receiveSCTx(
	requestSC: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	// ok

	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();
	//ok

	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);
	const inSigUSD = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGUSD).amount);
	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);
	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGRSV).amount);

	console.log('🚀 ~ inSigRSV:', inSigRSV);
	const bankNFT = bankBox.assets.find((asset) => asset.tokenId == TOKEN_BANK_NFT);
	console.log('🚀 ~ bankNFT:', bankNFT);

	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n; //543478260
	console.log('🚀 ~ oraclePrice:', oraclePrice);

	function minBigInt(...args: bigint[]) {
		return args.reduce((min, current) => (current < min ? current : min));
	}
	function maxBigInt(...args: bigint[]) {
		return args.reduce((max, current) => (current > max ? current : max));
	}
	function absBigInt(arg: bigint) {
		return arg > 0n ? arg : -arg;
	}

	function calculatePriceWithFee(
		inErg: bigint,
		inCircSigUSD: bigint,
		oraclePrice: bigint,
		requestSC: bigint
	): number {
		let rateSCERG: number;
		const bcReserveNeededIn = inCircSigUSD * oraclePrice;
		console.log(oraclePrice, ' +Reserve BC:', bcReserveNeededIn);
		const liabilitiesIn: bigint = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);

		const liableRate = liabilitiesIn / inCircSigUSD; // nanoerg for cent
		const scNominalPrice = minBigInt(liableRate, oraclePrice); // nanoerg for cent

		console.log('----------RATES-----------');
		console.log('🚀 ~ liableRate:', liableRate);
		console.log('🚀 ~ oraclePrice:', oraclePrice);
		console.log('🚀 ~ scNominalPrice:', scNominalPrice);
		console.log('                          ');

		console.log('--------------------------');
		console.log('🚀 ~ requestSC:', requestSC);
		const bcDeltaExpected = scNominalPrice * requestSC;
		console.log('🚀 ~ bcDeltaExpected:', bcDeltaExpected);
		const fee = absBigInt(bcDeltaExpected * FEE) / FEE_DENOM;
		console.log('🚀 ~ fee:', fee);
		const bcDeltaExpectedWithFee = bcDeltaExpected + fee;
		console.log('🚀 ~ bcDeltaExpectedWithFee:', bcDeltaExpectedWithFee);
		rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee);
		console.log('                          ');
		console.log('----------FINAL-----------');
		console.log('🚀 ~ rateSCERG:', rateSCERG);
		console.log('                          ');
		return rateSCERG; //cents for nanoerg
	}

	const rateWithFee = calculatePriceWithFee(inErg, inCircSigUSD, oraclePrice, requestSC);

	const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); //nanoerg
	console.log('---------EXCHANGE----------');
	console.log('🚀 ~ requestErg:', requestErg, ' | nanoergs');
	console.log('🚀 ~ requestSC:', requestSC, ' | cents');
	console.log('                          ');

	// Bank out
	const outErg = inErg + requestErg; //
	console.log('inErg:', inErg, ' + requestErg:', requestErg, ' = outErg:', outErg);

	const outSigUSD = inSigUSD - requestSC;
	console.log('inSigUSD:', inSigUSD, ' -requestSC:', requestSC, ' = outSigUSD:', outSigUSD);

	const outCircSigUSD = inCircSigUSD + requestSC;
	console.log('🚀 ~ outCircSigUSD:', outCircSigUSD);

	const outSigRSV = inSigRSV;
	const outCircSigRSV = inCircSigRSV;

	// ---------- OUTPUTS
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
			R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
		});

	const receiptBox = new OutputBuilder(SAFE_MIN_BOX_VALUE, myAddr)
		.addTokens({ tokenId: TOKEN_SIGUSD, amount: requestSC })
		.setAdditionalRegisters({
			R4: SLong(BigInt(requestSC)).toHex(), //value
			R5: SLong(BigInt(requestErg)).toHex() //nano erg
		});

	console.log(bankBox);
	console.log(oracleBox);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

export async function redeemSCTx(
	requestSC: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number
): any {
	const direction: bigint = -1n;
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);

	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();

	const inErg = BigInt(bankBox.value);
	console.log('🚀 ~ inErg:', inErg);
	const inSigUSD = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGUSD).amount);
	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	console.log('🚀 ~ inCircSigUSD:', inCircSigUSD);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);
	console.log('🚀 ~ inCircSigRSV:', inCircSigRSV);
	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId == TOKEN_SIGRSV).amount);

	console.log('🚀 ~ inSigRSV:', inSigRSV);
	const bankNFT = bankBox.assets.find((asset) => asset.tokenId == TOKEN_BANK_NFT);
	console.log('🚀 ~ bankNFT:', bankNFT);

	const oraclePrice = BigInt(oracleBox.additionalRegisters.R4.renderedValue) / 100n;
	console.log('🚀 ~ oraclePrice:', oraclePrice);

	function minBigInt(...args: bigint[]) {
		return args.reduce((min, current) => (current < min ? current : min));
	}
	function maxBigInt(...args: bigint[]) {
		return args.reduce((max, current) => (current > max ? current : max));
	}
	function absBigInt(arg: bigint) {
		return arg > 0n ? arg : -arg;
	}

	//-----------------------------------DIF---------------------------------------

	const rateWithFee = calculateSigUsdRateWithFee(
		inErg,
		inCircSigUSD,
		oraclePrice,
		requestSC,
		direction
	);

	const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); //nanoerg
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

	// ---------- OUTPUTS
	// ---------- Bank Box
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
			R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
		});
	// ---------- Change
	const receiptBox = new OutputBuilder(requestErg, myAddr).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestSC)).toHex(), //value
		R5: SLong(BigInt(direction * requestErg)).toHex() //nano erg
	});

	console.log(bankBox);
	console.log(oracleBox);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

//exchange SigRSV and SigUSD

export async function exchangeRsvTx(
	requestRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	//direction = 1n; // 1n or -1n

	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV, oraclePrice, bankBox, oracleBox } =
		await extractBoxesData();

	const rateWithFee = calculateSigRsvRateWithFee(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePrice,
		requestRSV,
		direction
	);

	const { requestErg, outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } =
		calculateOutputRsv(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			requestRSV,
			rateWithFee,
			direction
		);

	// ---------- BankOut ------------
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});

	// ---------- Receipt ------------
	console.log('direction=', direction, ' -1n?', direction == -1n);
	const receiptBox = new OutputBuilder(
		direction == -1n ? requestErg : SAFE_MIN_BOX_VALUE,
		myAddr
	).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestRSV)).toHex(),
		R5: SLong(BigInt(direction * requestErg)).toHex()
	});

	if (direction == 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGRSV, amount: requestRSV });
	}

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}

export async function exchangeScTx(
	requestSC: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);

	const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV, oraclePrice, bankBox, oracleBox } =
		await extractBoxesData();

	const rateWithFee = calculateSigUsdRateWithFee(
		inErg,
		inCircSigUSD,
		oraclePrice,
		requestSC,
		direction
	);

	const { requestErg, outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } =
		calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			requestSC,
			rateWithFee,
			direction
		);

	// ---------- Bank Box
	const BankOutBox = new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
			R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
		});

	// ---------- Receipt ------------
	console.log('direction=', direction, ' -1n?', direction == -1n);
	const receiptBox = new OutputBuilder(
		direction == -1n ? requestErg : SAFE_MIN_BOX_VALUE,
		myAddr
	).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestSC)).toHex(),
		R5: SLong(BigInt(direction * requestErg)).toHex()
	});

	if (direction == 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: requestSC });
	}

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedMintTransaction.dataInputs = [oracleBox];

	return unsignedMintTransaction;
}
