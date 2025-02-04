import {
	ErgoAddress,
	OutputBuilder,
	SAFE_MIN_BOX_VALUE,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { TOKEN_BANK_NFT, TOKEN_SIGRSV, TOKEN_SIGUSD, type Asset } from './api/ergoNode';
import type { Direction } from './sigmaUSDAndDexy';
import type { NodeBox } from './stores/bank.types';

function buildSigUsdBankBoxOut(
	bankAddr: ErgoAddress,
	outErg: bigint,
	outSigUSD: bigint,
	outSigRSV: bigint,
	outCircSigUSD: bigint,
	outCircSigRSV: bigint
): OutputBuilder {
	return new OutputBuilder(outErg, bankAddr)
		.addTokens([
			{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
			{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
			{ tokenId: TOKEN_BANK_NFT, amount: 1n }
		])
		.setAdditionalRegisters({
			R4: SLong(BigInt(outCircSigUSD)).toHex(),
			R5: SLong(BigInt(outCircSigRSV)).toHex()
		});
}

function buildSigUsdReceiptBoxOut(
	direction: Direction,
	myAddr: ErgoAddress,
	contractErg: bigint,
	tokenId: string,
	contractTokenAmount: bigint
): OutputBuilder {
	const receiptBox = new OutputBuilder(
		direction == -1n ? contractErg : SAFE_MIN_BOX_VALUE,
		myAddr
	).setAdditionalRegisters({
		R4: SLong(BigInt(direction * contractTokenAmount)).toHex(),
		R5: SLong(BigInt(direction * contractErg)).toHex()
	});

	if (direction == 1n) {
		receiptBox.addTokens({ tokenId, amount: contractTokenAmount });
	}
	return receiptBox;
}

export function buildTx_SIGUSD_ERG_USD(
	direction: Direction,
	contractErg: bigint,
	contractUSD: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	uiSwapFee: bigint,
	uiSwapFeeAddress: string,
	utxos: NodeBox[],
	outErg: bigint,
	outSigUSD: bigint,
	outSigRSV: bigint,
	outCircSigUSD: bigint,
	outCircSigRSV: bigint,
	feeMining: bigint
) {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(uiSwapFeeAddress);

	const BankOutBox = buildSigUsdBankBoxOut(
		bankAddr,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	);
	const receiptBox = buildSigUsdReceiptBoxOut(
		direction,
		myAddr,
		contractErg,
		TOKEN_SIGUSD,
		contractUSD
	);
	const uiFeeBox = new OutputBuilder(uiSwapFee, uiAddr);

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.withDataFrom(oracleBox)
		.to([BankOutBox, receiptBox, uiFeeBox])
		.sendChangeTo(myAddr)
		.payFee(feeMining)
		.build()
		.toEIP12Object();

	return unsignedMintTransaction;
}

export function buildTx_SIGUSD_ERG_RSV(
	direction: Direction,
	contractErg: bigint,
	contractRSV: bigint,
	holderBase58PK: string,
	bankBase58PK: string,
	height: number,
	bankBox: NodeBox,
	oracleBox: NodeBox,
	uiSwapFee: bigint,
	uiSwapFeeAddress: string,
	utxos: NodeBox[],
	outErg: bigint,
	outSigUSD: bigint,
	outSigRSV: bigint,
	outCircSigUSD: bigint,
	outCircSigRSV: bigint,
	feeMining: bigint
) {
	const myAddr = ErgoAddress.fromBase58(holderBase58PK);
	const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
	const uiAddr = ErgoAddress.fromBase58(uiSwapFeeAddress);

	const BankOutBox = buildSigUsdBankBoxOut(
		bankAddr,
		outErg,
		outSigUSD,
		outSigRSV,
		outCircSigUSD,
		outCircSigRSV
	);
	const receiptBox = buildSigUsdReceiptBoxOut(
		direction,
		myAddr,
		contractErg,
		TOKEN_SIGRSV,
		contractRSV
	);
	const uiFeeBox = new OutputBuilder(uiSwapFee, uiAddr);

	const unsignedMintTransaction = new TransactionBuilder(height)
		.from([bankBox, ...utxos])
		.withDataFrom(oracleBox)
		.to([BankOutBox, receiptBox, uiFeeBox])
		.sendChangeTo(myAddr)
		.payFee(feeMining)
		.build()
		.toEIP12Object();

	return unsignedMintTransaction;
}
