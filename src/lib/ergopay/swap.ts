import type { UnsignedTransaction } from '@fleet-sdk/common';
import { ErgoBox } from '@fleet-sdk/core';
import type { ReducedTransaction } from 'ergo-lib-wasm-nodejs';

export type ErgopayLinkParams = {
	swapPair: string;
	amount: number;
	ePayLinkId: string;
	lastInput: string;
	address: string;
};

export type ErgopayPaySigmaUsdSwapParams = ErgopayLinkParams & {
	utxo: ErgoBox[];
	oracleCandidates: ErgoBox[];
	bankCandidates: ErgoBox[];
};

export type CmdError = {
	code: number;
	message: string;
};

type ReducedTransactionBase64UrlEncodedString = string;

export type ErgopayPayCmdResponse = {
	status: 'ok' | 'error';
	reducedTx?: ReducedTransactionBase64UrlEncodedString;
	error?: CmdError;
};

type BuildSigmUsdSwapTransactionResponse = {
	status: 'ok' | 'error';
	unsignedTx?: UnsignedTransaction;
	error?: CmdError; // TODO: validation error string instead of this?
};

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

	const buildTxResponse = buildSigmUsdSwapTransaction(params, utxo, oracleBox, bankBox);

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
function grepBestSigmaUsdBankBox(
	oracleCandidates: ErgoBox<import('@fleet-sdk/common').NonMandatoryRegisters>[]
) {
	throw new Error('Function not implemented.');
}

function getSigmaUsdSwapParamValidationErrors(
	params: ErgopayPaySigmaUsdSwapParams
): CmdError | undefined {
	if (typeof params.amount != 'number') {
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
	// Question: first validate, then build tx?
	// OR build tx and validate while building?
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

// Function to read and parse JSON input from the command line
function parseCommandLineArgs(): ErgopayLinkParams {
	const args = process.argv.slice(2);

	if (args.length !== 1) {
		console.error("Usage: node script.js '<jsonString>'");
		process.exit(1);
	}

	try {
		const parsedParams: ErgopayLinkParams = JSON.parse(args[0]);
		return parsedParams;
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

// Execute parsing
const params = await run();
console.log('Parsed Parameters:', params);
