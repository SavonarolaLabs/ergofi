import { SIGUSD_BANK_ADDRESS, SIGUSD_BANK_TREE, type MempoolTransaction } from '$lib/api/ergoNode';
import {
	fetchOracleData,
	fetchSigmaUsdBankTransactions,
	fetchUtxosByErgoTree
} from '$lib/api/mempoolServer';
import {
	buyRSVInputERGTx,
	buyRSVInputRSVTx,
	buyUSDInputERGTx,
	buyUSDInputUSDTx,
	sellRSVInputERGTx,
	sellRSVInputRSVTx,
	sellUSDInputERGTx,
	sellUSDInputUSDTx
} from '$lib/sigmausd/sigmaUSD';
import type { NodeBox, OracleData } from '$lib/stores/bank.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';
import type {
	ErgopayLinkParams,
	ErgopayPaySigmaUsdSwapParams,
	ErgopayPayCmdResponse,
	BuildSigmUsdSwapTransactionResponse,
	CmdError,
	ErgoBoxCustom
} from './ergopaySwap.types';
import type { UnsignedTransaction } from '@fleet-sdk/common';

function grepBestOracleBox(oracles: OracleData): NodeBox {
	return oracles.confirmed_erg_usd[0];
}

function grepBestSigmaUsdBankBox(bankCandidates: MempoolSocketUpdate): NodeBox {
	return bankCandidates.confirmed_transactions[0].outputs.find(
		(o) => o.ergoTree == SIGUSD_BANK_TREE
	)!;
}

function getSigmaUsdSwapParamValidationErrors(
	params: ErgopayPaySigmaUsdSwapParams
): CmdError | undefined {
	if (typeof params.amount !== 'number') {
		return {
			code: 400,
			message: 'Amount must be a number.'
		};
	}
}

function buildSigmUsdSwapTransaction(
	{
		swapPair,
		amount,
		ePayLinkId,
		lastInput,
		payerErgoTree,
		feeMining
	}: ErgopayPaySigmaUsdSwapParams,
	utxo: NodeBox[],
	oracleBox: NodeBox,
	bankBox: NodeBox
): BuildSigmUsdSwapTransactionResponse {
	let unsignedTx;

	let height = 1453531; //<==

	console.log(swapPair, `${swapPair}_${lastInput}`);
	// prettier-ignore
	switch (`${swapPair}_${lastInput}`) {
        // prettier-ignore
        case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(BigInt(amount), payerErgoTree, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        default:
            throw new Error(`Unsupported swapPair and lastInput combination: ${swapPair}, ${lastInput}`);
    }

	return {
		status: 'ok',
		unsignedTx
	};
}

function reduceUnsignedTx(_unsignedTx: UnsignedTransaction): string {
	throw new Error('Function not implemented.');
}

export function parseCommandLineArgs(): ErgopayLinkParams {
	const args = process.argv.slice(2);

	if (args.length !== 1) {
		throw new Error("Usage: bun swap.cli.ts '<jsonString>'");
	}

	try {
		return JSON.parse(args[0]) as ErgopayLinkParams;
	} catch (error) {
		throw new Error('Invalid JSON input');
	}
}

function executeSigmaUsdSwap(params: ErgopayPaySigmaUsdSwapParams): ErgopayPayCmdResponse {
	const error = getSigmaUsdSwapParamValidationErrors(params);
	if (error) {
		return { status: 'error', error };
	}

	const oracleBox = grepBestOracleBox(params.oracleData);
	const bankBox = grepBestSigmaUsdBankBox(params.bankTransactions);

	const buildTxResponse = buildSigmUsdSwapTransaction(params, params.payerUtxo, oracleBox, bankBox);

	if (buildTxResponse.unsignedTx) {
		try {
			const reducedTx = reduceUnsignedTx(buildTxResponse.unsignedTx);
			return { status: 'ok', reducedTx };
		} catch (e) {
			return {
				status: 'error',
				error: {
					code: 500,
					message: e instanceof Error ? e.message : String(e)
				}
			};
		}
	} else {
		return buildTxResponse;
	}
}

export async function run(): Promise<ErgopayPayCmdResponse> {
	const cmdParams = parseCommandLineArgs();
	const utxo = await fetchUtxosByErgoTree(cmdParams.payerErgoTree);
	const oracleData = await fetchOracleData();
	const bankCandidates = await fetchSigmaUsdBankTransactions();

	const swapParams = { ...cmdParams, utxo, oracleData, bankCandidates };
	const swapResult = executeSigmaUsdSwap(swapParams);
	console.log('TX READY:', swapResult);
	return swapResult;
}
