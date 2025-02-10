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
		console.log('REDUCE PROBLEM?');
		let unsignedTx = buildSigmUsdSwapTransaction(params);
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
	const cmdParams = {
		swapPair: 'ERG/SIGUSD',
		amount: 1.1,
		ePayLinkId: 'abcd1234',
		lastInput: 'ERG',
		payerAddress: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		feeMining: 0.1
	}; //parseCommandLineArgs();

	// fetch chain context
	const height = 1458647; // TODO: add fetch height
	const payerUtxo = await fetchUtxosByErgoTree(cmdParams.payerAddress);
	const oracleData = await fetchOracleData();
	const bankTransactions = await fetchSigmaUsdBankTransactions();
	const context = await createContext(height);

	console.log(cmdParams);

	console.log('GET UTXOS:');
	console.log('lenght:', payerUtxo.length);
	payerUtxo.map((o) => console.log(o.boxId));
	console.dir(
		payerUtxo.find(
			(o) => o.boxId == 'cd4e574494033a9a84c97a3e545b0de7f2c08fe2b45fea38dd4b3c64590d55da'
		),
		{ depth: null }
	);
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

const x = await run();
console.log(x);
