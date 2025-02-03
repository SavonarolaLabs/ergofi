import { ErgoBox } from '@fleet-sdk/core'; // or from './swap.types' if you prefer
import type {
	ErgopayLinkParams,
	ErgopayPaySigmaUsdSwapParams,
	ErgopayPayCmdResponse,
	BuildSigmUsdSwapTransactionResponse,
	CmdError
} from './swap.types';

import type { UnsignedTransaction } from '@fleet-sdk/common';

function grepBestOracleBox(_arg: any): ErgoBox {
	throw new Error('Function not implemented.');
}

function grepBestSigmaUsdBankBox(_oracleCandidates: ErgoBox[]): ErgoBox {
	throw new Error('Function not implemented.');
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
	_params: ErgopayPaySigmaUsdSwapParams,
	_utxo: ErgoBox[],
	_oracleBox: ErgoBox,
	_bankBox: ErgoBox
): BuildSigmUsdSwapTransactionResponse {
	return {
		status: 'error',
		error: {
			code: 422,
			message: 'Reserve rate is below 400%. SigmaUSD mint is not possible.'
		}
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
export function fetchUtxoByAddress(_address: string): Promise<ErgoBox[]> {
	return Promise.resolve([]);
}

export function fetchOracleCandidateBoxes(_oracle: string): Promise<ErgoBox[]> {
	return Promise.resolve([]);
}

export function fetchSigmaUsdBankBoxCandidates(): Promise<ErgoBox[]> {
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
	return swapResult;
}
