import { SIGUSD_BANK_ADDRESS } from '$lib/api/ergoNode';
import {
	buyRSVInputERGTx,
	buyRSVInputRSVTx,
	buyUSDInputERGTx,
	buyUSDInputUSDTx,
	sellRSVInputERGTx,
	sellRSVInputRSVTx,
	sellUSDInputERGTx,
	sellUSDInputUSDTx
} from '$lib/sigmaUSD';
import type {
	ErgopayLinkParams,
	ErgopayPaySigmaUsdSwapParams,
	ErgopayPayCmdResponse,
	BuildSigmUsdSwapTransactionResponse,
	CmdError,
	ErgoBoxCustom
} from './swap.types';

import type { UnsignedTransaction } from '@fleet-sdk/common';

function grepBestOracleBox(oracleCandidates: ErgoBoxCustom[]): ErgoBoxCustom {
	return oracleCandidates[0];
}

function grepBestSigmaUsdBankBox(bankCandidates: ErgoBoxCustom[]): ErgoBoxCustom {
	return bankCandidates[0];
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
	{ swapPair, amount, ePayLinkId, lastInput, address, feeMining }: ErgopayPaySigmaUsdSwapParams,
	utxo: ErgoBoxCustom[],
	oracleBox: ErgoBoxCustom,
	bankBox: ErgoBoxCustom
): BuildSigmUsdSwapTransactionResponse {
	let unsignedTx;

	let height = 1453531; //<==

	console.log(swapPair, `${swapPair}_${lastInput}`);
	console.log('🚀 ~ bankBox:', bankBox);
	console.log('🚀 ~ oracleBox:', oracleBox);
	// prettier-ignore
	switch (`${swapPair}_${lastInput}`) {
        // prettier-ignore
        case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height,  1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height,  1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, -1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, -1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height,  1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height,  1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, -1n, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, -1n, bankBox, oracleBox, BigInt(feeMining)); break;
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

	const oracleBox = grepBestOracleBox(params.oracleCandidates);
	const bankBox = grepBestSigmaUsdBankBox(params.oracleCandidates);

	const buildTxResponse = buildSigmUsdSwapTransaction(params, params.utxo, oracleBox, bankBox);

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
		// buildTxResponse itself has an error
		return buildTxResponse;
	}
}

/**
 * Dummy fetch functions that we can mock in tests.
 */
export function fetchUtxoByAddress(_address: string): Promise<ErgoBoxCustom[]> {
	return Promise.resolve([]);
}

export function fetchOracleCandidateBoxes(_oracle: string): Promise<ErgoBoxCustom[]> {
	return Promise.resolve([]);
}

export function fetchSigmaUsdBankBoxCandidates(): Promise<ErgoBoxCustom[]> {
	return Promise.resolve([]);
}

/**
 * Main run function — call parseCommandLineArgs() and then do everything
 */
export async function run(): Promise<ErgopayPayCmdResponse> {
	const cmdParams = parseCommandLineArgs();
	const utxo = await fetchUtxoByAddress(cmdParams.address);
	const oracleCandidates = await fetchOracleCandidateBoxes('erg_usd');
	const bankCandidates = await fetchSigmaUsdBankBoxCandidates();

	const swapParams = { ...cmdParams, utxo, oracleCandidates, bankCandidates };
	const swapResult = executeSigmaUsdSwap(swapParams);
	console.log('TX READY:', swapResult);
	return swapResult;
}
