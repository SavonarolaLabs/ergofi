import { calculateAmountAndSwapPrice } from '$lib/sigmausd/sigmaUSDInputRecalc';
import {
	bank_box,
	fee_mining,
	oracle_box,
	sigmausd_numbers,
	updateBankBoxAndOracle
} from '$lib/stores/bank';
import type { NodeBox } from '$lib/stores/bank.types';
import { get } from 'svelte/store';
import {
	getSwapTag,
	inputTicker,
	isLpTokenInput,
	isLpTokenOutput,
	outputTicker,
	type SwapIntention,
	type SwapItem,
	type SwapPreview
} from '../swapIntention';
import { selected_contract } from '$lib/stores/ui';
import { buildSwapDexyGoldTx } from '$lib/dexygold/dexyGold';
import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_lp_mint_box,
	dexygold_lp_redeem_box,
	dexygold_lp_swap_box,
	dexygold_tracking101_box,
	dexygold_widget_numbers,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import { SIGUSD_BANK_ADDRESS } from '$lib/api/ergoNode';
import { createInteractionAndSubmitTx, getWeb3WalletData } from '$lib/asdf';
import { buildSwapSigmaUsdTx } from '$lib/sigmausd/sigmaUSD';
import { amountToValue } from '$lib/utils';

export function recalcAmountAndPrice(
	inputItem: SwapItem,
	swapIntent: SwapIntention
): SwapPreview | undefined {
	if (!get(oracle_box) || !get(bank_box)) return;

	const swapPreview = calculateAmountAndSwapPrice(
		inputItem,
		swapIntent,
		get(sigmausd_numbers),
		get(fee_mining)
	)!;

	return swapPreview;
}

export function recalcSigUsdBankAndOracleBoxes(oracleBox: NodeBox, bankBox: NodeBox) {
	if (!oracleBox || !bankBox) return;
	updateBankBoxAndOracle(oracleBox, bankBox, get(fee_mining));
	window.document.title = `↑${get(sigmausd_numbers).bankPriceUsdSell} ↓${get(sigmausd_numbers).bankPriceUsdBuy} | SigUSD`;
}

export function getFromLabel(swapIntent: SwapIntention): string {
	if (isLpTokenOutput(swapIntent)) return 'Add Liquidity';
	if (isLpTokenInput(swapIntent)) return 'Remove Liquidity';
	return 'From';
}

export function isSwapDisabledCalc(swapIntent: SwapIntention) {
	if (get(selected_contract) == 'SigmaUsd' && !(get(sigmausd_numbers).leftUSD > 0)) {
		if (inputTicker(swapIntent, 0) == 'ERG' && outputTicker(swapIntent, 0) == 'SigUSD') {
			return true;
		} else if (inputTicker(swapIntent, 0) == 'SigRSV' && outputTicker(swapIntent, 0) == 'ERG') {
			return true;
		}
	}
	return false;
}

export async function handleSwapButtonDexyGold(
	swapIntent: SwapIntention,
	fromValue: string[],
	toValue: string[]
) {
	let dexyGoldUtxo = {
		lpSwapIn: get(dexygold_lp_swap_box),
		lpMintIn: get(dexygold_lp_mint_box),
		lpRedeemIn: get(dexygold_lp_redeem_box),
		freeMintIn: get(dexygold_bank_free_mint_box),
		bankIn: get(dexygold_bank_box),
		buybankIn: get(dexygold_buyback_box),
		arbMintIn: get(dexygold_bank_arbitrage_mint_box),
		lpIn: get(dexygold_lp_box),
		goldOracle: get(oracle_erg_xau_box),
		tracking101: get(dexygold_tracking101_box)
	};

	const { me, utxos, height } = await getWeb3WalletData();

	const unsignedTx = buildSwapDexyGoldTx(
		swapIntent,
		me,
		height,
		get(fee_mining),
		utxos,
		dexyGoldUtxo,
		get(dexygold_widget_numbers)
	);

	await createInteractionAndSubmitTx(unsignedTx, [me]);
}

export async function handleSwapButtonSigUsd(
	swapIntent: SwapIntention,
	fromValue: string[],
	toValue: string[]
) {
	const fromAsset = {
		token: inputTicker(swapIntent, 0),
		amount: fromValue[0]
	};
	const toAsset = {
		token: outputTicker(swapIntent, 0),
		amount: toValue[0]
	};

	const { me, utxos, height } = await getWeb3WalletData();
	const unsignedTx = buildSwapSigmaUsdTx(
		swapIntent,
		me,
		SIGUSD_BANK_ADDRESS,
		utxos,
		height,
		get(bank_box),
		get(oracle_box),
		get(fee_mining)
	);

	await createInteractionAndSubmitTx(unsignedTx, [me]);
}

export function updateUiValues(swapIntent: SwapIntention, fromValue: string[], toValue: string[]) {
	swapIntent.filter((s) => s.side == 'input').forEach((s, i) => (fromValue[i] = s.value));
	swapIntent.filter((s) => s.side == 'output').forEach((s, i) => (toValue[i] = s.value));
}

export function updateIntentValues(swapPreview: SwapPreview) {
	swapPreview.calculatedIntent.forEach((s) => {
		s.value = amountToValue(s);
	});

	return swapPreview.calculatedIntent;
}
