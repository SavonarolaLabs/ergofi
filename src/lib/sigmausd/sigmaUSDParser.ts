import type { NodeBox } from '../stores/bank.types';
import { decodeBigInt } from '../utils';

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
	const inCircSigUSD = decodeBigInt(bankBox.additionalRegisters.R4);
	const inCircSigRSV = decodeBigInt(bankBox.additionalRegisters.R5);

	return {
		inErg,
		inSigUSD,
		inSigRSV,
		inCircSigUSD,
		inCircSigRSV
	};
}

export function parseErgUsdOracleBox(oracleBox: NodeBox): ParsedErgUsdOracleBox {
	const oraclePrice = decodeBigInt(oracleBox.additionalRegisters.R4) / 100n; // nanoerg for cent
	return {
		oraclePrice
	};
}
