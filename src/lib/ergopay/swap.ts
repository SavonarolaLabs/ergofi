import { ErgoBox } from '@fleet-sdk/core';
import type {
	ErgopayLinkParams,
	ErgopayPaySigmaUsdSwapParams,
	ErgopayPayCmdResponse,
	BuildSigmUsdSwapTransactionResponse,
	CmdError
} from './swap.types';
import type { UnsignedTransaction } from '@fleet-sdk/common';

function executeSigmaUsdSwap(params: ErgopayPaySigmaUsdSwapParams): ErgopayPayCmdResponse {
	const error = getSigmaUsdSwapParamValidationErrors(params);
	if (error) {
		return {
			status: 'error',
			error
		};
	}

	const oracleBox = grepBestOracleBox(params.oracleCandidates);
	const bankBox = grepBestSigmaUsdBankBox(params.oracleCandidates);

	const buildTxResponse = buildSigmUsdSwapTransaction(params, params.utxo, oracleBox, bankBox);

	if (buildTxResponse.unsignedTx) {
		try {
			const reducedTx = reduceUnsignedTx(buildTxResponse.unsignedTx);
			return {
				status: 'ok',
				reducedTx
			};
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

function grepBestOracleBox(arg0: any) {
	throw new Error('Function not implemented.');
}

function grepBestSigmaUsdBankBox(oracleCandidates: ErgoBox[]) {
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
	params: ErgopayPaySigmaUsdSwapParams,
	utxo: ErgoBox[],
	oracleBox: ErgoBox,
	bankBox: ErgoBox
): BuildSigmUsdSwapTransactionResponse {
	return {
		status: 'error',
		error: {
			code: 422,
			message: 'Reserve rate is below 400%. SigmaUSD mint is not possible.'
		}
	};
}

function reduceUnsignedTx(unsignedTx: UnsignedTransaction): string {
	throw new Error('Function not implemented.');
}

function parseCommandLineArgs(): ErgopayLinkParams {
	const args = process.argv.slice(2);

	if (args.length !== 1) {
		console.error("Usage: node script.js '<jsonString>'");
		process.exit(1);
	}

	try {
		return JSON.parse(args[0]);
	} catch (error) {
		console.error('Invalid JSON input:', error);
		process.exit(1);
	}
}

function fetchUtxoByAddress(address: string): Promise<ErgoBox[]> {
	return Promise.resolve([]);
}

function fetchOracleCandidateBoxes(oracle: string): Promise<ErgoBox[]> {
	return Promise.resolve([]);
}

function fetchSigmaUsdBankBoxCandidates(): Promise<ErgoBox[]> {
	return Promise.resolve([]);
}

async function run(): Promise<ErgopayPayCmdResponse> {
	const cmdParams = parseCommandLineArgs();

	const utxo = await fetchUtxoByAddress(cmdParams.address);
	const oracleCandidates = await fetchOracleCandidateBoxes('erg_usd');
	const bankCandidates = await fetchSigmaUsdBankBoxCandidates();

	const swapParams = { ...cmdParams, utxo, oracleCandidates, bankCandidates };

	const swapResult = executeSigmaUsdSwap(swapParams);
	return swapResult;
}

const params = await run();
console.log('Parsed Parameters:', params);
