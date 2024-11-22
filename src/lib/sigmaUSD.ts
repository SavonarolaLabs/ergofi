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

const TOKEN_SIGRSV = '003bd19d0187117f130b62e1bcab0939929ff5f7709f843c5c4dd158949285d0'; // SigRSV
const TOKEN_SIGUSD = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'; // SigUSD
const TOKEN_BANK_NFT = '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9'; // SUSD Bank V2 NFT

const FEE = 200n;
const FEE_DENOM = 10_000n;

function minBigInt(...args: bigint[]) {
	return args.reduce((min, current) => (current < min ? current : min));
}
function maxBigInt(...args: bigint[]) {
	return args.reduce((max, current) => (current > max ? current : max));
}
function absBigInt(arg: bigint) {
	return arg > 0n ? arg : -arg;
}

function getUserBalances(utxos: Array<any>) {
	let userErgBalance = 0n;
	let userSigUSDBalance = 0n;
	utxos.forEach((utxo) => {
		userErgBalance += BigInt(utxo.value);
		utxo.assets.forEach((asset) => {
			if (asset.tokenId === TOKEN_SIGUSD) {
				userSigUSDBalance += BigInt(asset.amount);
			}
		});
	});
	return { userErgBalance, userSigUSDBalance };
}

async function extractBoxesData(utxos: Array<any>) {
	const oracleBox = await getOracleBox();
	const bankBox = await getBankBox();

	const inErg = BigInt(bankBox.value);
	const inSigUSD = BigInt(bankBox.assets.find((asset) => asset.tokenId === TOKEN_SIGUSD).amount);
	const inSigRSV = BigInt(bankBox.assets.find((asset) => asset.tokenId === TOKEN_SIGRSV).amount);
	const inCircSigUSD = BigInt(bankBox.additionalRegisters.R4.renderedValue);
	const inCircSigRSV = BigInt(bankBox.additionalRegisters.R5.renderedValue);

	bankBox.additionalRegisters.R4 = bankBox.additionalRegisters.R4.serializedValue;
	bankBox.additionalRegisters.R5 = bankBox.additionalRegisters.R5.serializedValue;

	// ORACLE PRICE in nanoERG per cent
	const oraclePriceNanoErgPerCent = BigInt(oracleBox.additionalRegisters.R4.renderedValue);
	// Oracle price in SigUSD per ERG (cents per ERG)
	const oraclePriceSigUSDPerERG = (1_000_000_000n * 100n) / oraclePriceNanoErgPerCent;

	// User balances
	const { userErgBalance, userSigUSDBalance } = getUserBalances(utxos);

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePriceNanoErgPerCent,
		oraclePriceSigUSDPerERG,
		bankBox,
		oracleBox,
		userErgBalance,
		userSigUSDBalance
	};
}

function calculateSigUsdRateWithFee(
	inErg: bigint,
	inCircSigUSD: bigint,
	oraclePriceNanoErgPerCent: bigint,
	amountERG: bigint,
	priceSigUSDPerERG: bigint,
	direction: bigint
): { rateSCERG: number; fee: bigint } {
	// Convert priceSigUSDPerERG (cents per ERG) to scNominalPrice (nanoERG per cent)
	const scNominalPrice = (1_000_000_000n * 100n) / priceSigUSDPerERG;
	const bcReserveNeededIn = inCircSigUSD * oraclePriceNanoErgPerCent;
	const liabilitiesIn = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const liableRate = liabilitiesIn / inCircSigUSD;
	const scNominalPriceEffective = minBigInt(liableRate, oraclePriceNanoErgPerCent);

	const requestSC = (priceSigUSDPerERG * amountERG) / 1_000_000_000n; // in cents
	const bcDeltaExpected = scNominalPriceEffective * requestSC;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + fee * direction;
	const rateSCERG = Number(requestSC) / Number(bcDeltaExpectedWithFee);

	return { rateSCERG, fee };
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
	const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); // nanoERG
	const outErg = inErg + requestErg * direction;
	const outSigUSD = inSigUSD - requestSC * direction;
	const outCircSigUSD = inCircSigUSD + requestSC * direction;
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

function calculateSigRsvRateWithFee(
	inErg: bigint,
	inCircSigUSD: bigint,
	inCircSigRSV: bigint,
	oraclePriceNanoErgPerCent: bigint,
	amountERG: bigint,
	priceSigUSDPerERG: bigint,
	direction: bigint
): { rateRSVERG: number; fee: bigint } {
	// Similar logic to calculateSigUsdRateWithFee but for SigRSV
	// Implement according to your protocol's specifics
	// For brevity, assuming similar structure
	const bcReserveNeededIn = inCircSigUSD * oraclePriceNanoErgPerCent;
	const liabilitiesIn = maxBigInt(minBigInt(bcReserveNeededIn, inErg), 0n);
	const equityIn = inErg - liabilitiesIn;
	const equityRate = equityIn / inCircSigRSV;

	const requestRSV = (priceSigUSDPerERG * amountERG) / 1_000_000_000n; // Adjust calculation as needed
	const bcDeltaExpected = equityRate * requestRSV;
	const fee = absBigInt((bcDeltaExpected * FEE) / FEE_DENOM);
	const bcDeltaExpectedWithFee = bcDeltaExpected + direction * fee;
	const rateRSVERG = Number(requestRSV) / Number(bcDeltaExpectedWithFee);

	return { rateRSVERG, fee };
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
	const outErg = inErg + direction * requestErg;
	const outSigRSV = inSigRSV - direction * requestRSV;
	const outCircSigRSV = inCircSigRSV + direction * requestRSV;
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

export async function exchangeScTx(
	amountERG: bigint,
	priceSigUSDPerERG: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);

	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePriceNanoErgPerCent,
		bankBox,
		oracleBox
	} = await extractBoxesData(utxos);

	const requestSC = (priceSigUSDPerERG * amountERG) / 1_000_000_000n; // in cents

	const { rateSCERG, fee } = calculateSigUsdRateWithFee(
		inErg,
		inCircSigUSD,
		oraclePriceNanoErgPerCent,
		amountERG,
		priceSigUSDPerERG,
		direction
	);

	const { requestErg, outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		requestSC,
		rateSCERG,
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
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});

	// ---------- Receipt Box ------------
	const receiptBox = new OutputBuilder(direction === -1n ? requestErg : SAFE_MIN_BOX_VALUE, myAddr).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestSC)).toHex(),
		R5: SLong(BigInt(direction * requestErg)).toHex()
	});

	if (direction === 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: requestSC });
	}

	const unsignedTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedTransaction.dataInputs = [oracleBox];

	return unsignedTransaction;
}

export async function exchangeRsvTx(
	amountERG: bigint,
	priceSigUSDPerERG: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number,
	direction: bigint
): any {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);

	const {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		oraclePriceNanoErgPerCent,
		bankBox,
		oracleBox
	} = await extractBoxesData(utxos);

	const requestRSV = (priceSigUSDPerERG * amountERG) / 1_000_000_000n; // Adjust calculation as needed

	const { rateRSVERG, fee } = calculateSigRsvRateWithFee(
		inErg,
		inCircSigUSD,
		inCircSigRSV,
		oraclePriceNanoErgPerCent,
		amountERG,
		priceSigUSDPerERG,
		direction
	);

	const { requestErg, outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputRsv(
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV,
		requestRSV,
		rateRSVERG,
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
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});

	// ---------- Receipt Box ------------
	const receiptBox = new OutputBuilder(direction === -1n ? requestErg : SAFE_MIN_BOX_VALUE, myAddr).setAdditionalRegisters({
		R4: SLong(BigInt(direction * requestRSV)).toHex(),
		R5: SLong(BigInt(direction * requestErg)).toHex()
	});

	if (direction === 1n) {
		receiptBox.addTokens({ tokenId: TOKEN_SIGRSV, amount: requestRSV });
	}

	const unsignedTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.to([BankOutBox, receiptBox])
		.sendChangeTo(myAddr)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedTransaction.dataInputs = [oracleBox];

	return unsignedTransaction;
}

// Utility function to map UI inputs to transaction
export async function createExchangeTransaction(
	type: 'buy' | 'sell',
	amountERG: number,
	priceSigUSDPerERG: number,
	holderBase58PK: string,
	bankBase58PK: string,
	utxos: Array<any>,
	height: number
) {
	const direction = type === 'buy' ? 1n : -1n;
	const amountERGBigInt = BigInt(Math.round(amountERG * 1e9)); // Convert ERG to nanoERG
	const priceSigUSDPerERGBigInt = BigInt(Math.round(priceSigUSDPerERG * 100)); // Convert SigUSD to cents

	if (/* condition to decide between exchangeScTx or exchangeRsvTx */) {
		return await exchangeScTx(
			amountERGBigInt,
			priceSigUSDPerERGBigInt,
			holderBase58PK,
			bankBase58PK,
			utxos,
			height,
			direction
		);
	} else {
		return await exchangeRsvTx(
			amountERGBigInt,
			priceSigUSDPerERGBigInt,
			holderBase58PK,
			bankBase58PK,
			utxos,
			height,
			direction
		);
	}
}
