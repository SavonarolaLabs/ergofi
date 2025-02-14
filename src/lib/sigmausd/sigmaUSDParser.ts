import type { NodeBox } from '../stores/bank.types';
import { parseBigInt } from '../utils';

export type ParsedSigUsdBankBox = {
	inErg: bigint;
	inSigUSD: bigint;
	inSigRSV: bigint;
	inCircSigUSD: bigint;
	inCircSigRSV: bigint;
};

export type ParsedErgUsdOracleBox = {
	oraclePrice: bigint;
};

export function parseSigUsdBankBox(bankBox: NodeBox): ParsedSigUsdBankBox {
	const inErg = BigInt(bankBox.value);
	const inSigUSD = BigInt(bankBox.assets[0].amount);
	const inSigRSV = BigInt(bankBox.assets[1].amount);
	const inCircSigUSD = parseBigInt(bankBox.additionalRegisters.R4);
	const inCircSigRSV = parseBigInt(bankBox.additionalRegisters.R5);

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV
	};
}

export function parseErgUsdOracleBox(oracleBox: NodeBox): ParsedErgUsdOracleBox {
	const oraclePrice = parseBigInt(oracleBox.additionalRegisters.R4) / 100n; // nanoerg for cent
	return {
		oraclePrice
	};
}
