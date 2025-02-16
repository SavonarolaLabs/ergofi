import { calculateAmountAndSwapPrice } from '$lib/sigmausd/sigmaUSDInputRecalc';
import {
	bank_box,
	bank_box_circulating_rsv,
	bank_box_circulating_usd_cent,
	bank_box_nano_erg,
	bank_price_usd_buy,
	bank_price_usd_sell,
	fee_mining,
	oracle_box,
	oracle_price_sig_usd_cent,
	reserve_border_left_USD,
	updateBankBoxAndOracle,
	updateBankPrices,
	updateBankStats
} from '$lib/stores/bank';
import type { NodeBox } from '$lib/stores/bank.types';
import { get } from 'svelte/store';
import {
	inputTicker,
	isLpTokenInput,
	isLpTokenOutput,
	outputTicker,
	type SwapIntention,
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

export function recalcAmountAndPrice(swapIntent: SwapIntention) {
	if (!get(oracle_box) || !get(bank_box)) return;

	// get these values from swap intent, or pass down
	const fromToken = 'ERG';
	const fromAmount = '1';
	const toToken = 'SigUSD';
	const toAmount = '1';
	const lastInput = 'From';

	const { from, to, price } = calculateAmountAndSwapPrice(
		lastInput,
		fromToken,
		fromAmount,
		toToken,
		toAmount,
		get(bank_box_nano_erg),
		get(bank_box_circulating_usd_cent),
		get(bank_box_circulating_rsv),
		get(oracle_price_sig_usd_cent),
		get(fee_mining)
	)!;
	return { price, from, to };
}

export function recalcSigUsdBankAndOracleBoxes(oracleBox: NodeBox, bankBox: NodeBox) {
	if (!oracleBox || !bankBox) return;
	updateBankBoxAndOracle(oracleBox, bankBox);
	updateBankStats();
	updateBankPrices();
	window.document.title = `↑${get(bank_price_usd_sell)} ↓${get(bank_price_usd_buy)} | SigUSD`;
}

export function getFromLabel(swapIntent: SwapIntention): string {
	if (isLpTokenOutput(swapIntent)) return 'Add Liquidity';
	if (isLpTokenInput(swapIntent)) return 'Remove Liquidity';
	return 'From';
}

export function isSwapDisabledCalc(swapIntent: SwapIntention) {
	if (get(selected_contract) == 'SigmaUsd' && !(get(reserve_border_left_USD) > 0)) {
		if (inputTicker(swapIntent, 0) == 'ERG' && outputTicker(swapIntent, 0) == 'SigUSD') {
			return true;
		} else if (inputTicker(swapIntent, 0) == 'SigRSV' && outputTicker(swapIntent, 0) == 'ERG') {
			return true;
		}
	}
	return false;
}

export async function handleSwapButtonDexyGold(
	swapInten: SwapIntention,
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

	const input = 1_000_000_000n;

	const fromAssets = [];
	const toAssets = [];

	const unsignedTx = buildSwapDexyGoldTx(
		fromAssets,
		toAssets,
		input,
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
	swapInten: SwapIntention,
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
		$bank_box,
		$oracle_box,
		$fee_mining
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
