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
	updateBankBoxAndOracle,
	updateBankPrices,
	updateBankStats
} from '$lib/stores/bank';
import type { NodeBox } from '$lib/stores/bank.types';
import { get } from 'svelte/store';
import type { SwapIntention } from '$lib/swapIntention';

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
