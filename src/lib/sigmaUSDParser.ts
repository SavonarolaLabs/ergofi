import { TOKEN_SIGRSV, TOKEN_SIGUSD, type Asset } from './api/ergoNode';
import type { NodeBox } from './stores/bank.types';
import { decodeBigInt } from './utils';

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
	const inSigUSD = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGUSD)!.amount
	);
	const inSigRSV = BigInt(
		bankBox.assets.find((asset: Asset) => asset.tokenId == TOKEN_SIGRSV)!.amount
	);
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
