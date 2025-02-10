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
	ErgopayPayCmdResponse
} from './ergopaySwap.types';
import type { EIP12UnsignedTransaction, UnsignedTransaction } from '@fleet-sdk/common';
import { reducedFromUnsignedTx } from '$lib/dexygold/signing';
import { createContext } from '$lib/fakeContext';
import { ergStringToNanoErg } from '$lib/utils';

function grepBestOracleBox(oracles: OracleData): NodeBox {
	return oracles.confirmed_erg_usd[0];
}

function grepBestSigmaUsdBankBox(bankCandidates: MempoolSocketUpdate): NodeBox {
	return bankCandidates.confirmed_transactions[0].outputs.find(
		(o) => o.ergoTree == SIGUSD_BANK_TREE
	)!;
}

// prettier-ignore
function buildSigmUsdSwapTransaction( params: ErgopayPaySigmaUsdSwapParams ): EIP12UnsignedTransaction {
	const { swapPair, amount, lastInput, payerAddress, feeMining, payerUtxo, oracleBox, bankBox, height } = params;
	//console.dir(params,{depth:null})
	console.log(amount,'amount')
	console.log(BigInt(ergStringToNanoErg(amount)),':BigInt(ergStringToNanoErg(amount)')
	console.log(feeMining,'feeMining')
	console.log(BigInt(ergStringToNanoErg(feeMining)),'BigInt(ergStringToNanoErg(feeMining))')

	let unsignedTx;
	switch (`${swapPair}_${lastInput}`) {
        case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (BigInt(ergStringToNanoErg(amount)), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(ergStringToNanoErg(feeMining))); break;
        case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(BigInt(amount), payerAddress, SIGUSD_BANK_ADDRESS, payerUtxo, height, bankBox, oracleBox, BigInt(feeMining)); break;
        default:
            throw new Error(`Unsupported swapPair and lastInput combination: ${swapPair}, ${lastInput}`); // TODO return explicit error
    }

	return unsignedTx;
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

function buildReducedSigmUsdSwapTransaction(
	params: ErgopayPaySigmaUsdSwapParams
): ErgopayPayCmdResponse {
	try {
		let unsignedTx = buildSigmUsdSwapTransaction(params);
		console.log('BUILDED BOM BOM');
		const reducedTx = reducedFromUnsignedTx(unsignedTx, params.context);
		return { status: 'ok', reducedTx };
	} catch (e) {
		console.error(e);
		return {
			status: 'error',
			error: {
				code: 500,
				message: e instanceof Error ? e.message : String(e)
			}
		};
	}
}

export async function run(): Promise<ErgopayPayCmdResponse> {
	const cmdParams = parseCommandLineArgs();

	// fetch chain context
	const height = 1458647; // TODO: add fetch height
	const payerUtxo = await fetchUtxosByErgoTree(cmdParams.payerAddress);
	const oracleData = await fetchOracleData();
	const bankTransactions = await fetchSigmaUsdBankTransactions();
	const context = await createContext(height);

	console.log('GET UTXOS:');
	console.log('lenght:', payerUtxo.length);
	console.dir(payerUtxo, { depth: null });
	console.log('lenght:', payerUtxo.length);

	// select best boxes
	const oracleBox = grepBestOracleBox(oracleData);
	const bankBox = grepBestSigmaUsdBankBox(bankTransactions);

	// build swap transaction
	const swapParams: ErgopayPaySigmaUsdSwapParams = {
		...cmdParams,
		payerUtxo,
		oracleBox,
		bankBox,
		height,
		context
	};

	const txBuildAttempt: ErgopayPayCmdResponse = buildReducedSigmUsdSwapTransaction(swapParams);

	return txBuildAttempt;
}
