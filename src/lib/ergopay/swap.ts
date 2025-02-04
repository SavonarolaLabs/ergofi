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
} from '$lib/sigmausd/sigmaUSD';
import type { NodeBox, OracleData } from '$lib/stores/bank.types';
import type {
	ErgopayLinkParams,
	ErgopayPaySigmaUsdSwapParams,
	ErgopayPayCmdResponse,
	BuildSigmUsdSwapTransactionResponse,
	CmdError,
	ErgoBoxCustom
} from './swap.types';
import type { UnsignedTransaction } from '@fleet-sdk/common';

function grepBestOracleBox(oracleCandidates: OracleData): NodeBox {
	return oracleCandidates.confirmed_erg_usd[0];
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
	utxo: NodeBox[],
	oracleBox: NodeBox,
	bankBox: ErgoBoxCustom
): BuildSigmUsdSwapTransactionResponse {
	let unsignedTx;

	let height = 1453531; //<==

	console.log(swapPair, `${swapPair}_${lastInput}`);
	// prettier-ignore
	switch (`${swapPair}_${lastInput}`) {
        // prettier-ignore
        case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(BigInt(amount), address, SIGUSD_BANK_ADDRESS, utxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
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
	const bankBox = grepBestSigmaUsdBankBox(params.bankCandidates);

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
		return buildTxResponse;
	}
}

export async function fetchUtxoByAddress(_address: string): Promise<ErgoBoxCustom[]> {
	const response = await fetch('https://dummyapi.io/utxo');
	return response.json();
}

export async function fetchOracleData(): Promise<ErgoBoxCustom[]> {
	// TODO: same response as we get from oracle socket.
	const response = await fetch('https://dummyapi.io/oracle');
	return response.json();
}

export async function fetchSigmaUsdBankBoxCandidates(): Promise<ErgoBoxCustom[]> {
	const response = await fetch('https://dummyapi.io/bank');
	return response.json();
}

export async function run(): Promise<ErgopayPayCmdResponse> {
	const cmdParams = parseCommandLineArgs();
	const utxo = await fetchUtxoByAddress(cmdParams.address);
	const oracleData = await fetchOracleData();
	const bankCandidates = await fetchSigmaUsdBankBoxCandidates();

	const swapParams = { ...cmdParams, utxo, oracleData, bankCandidates };
	const swapResult = executeSigmaUsdSwap(swapParams);
	console.log('TX READY:', swapResult);
	return swapResult;
}
