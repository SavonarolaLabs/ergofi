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
import type { Currency, LastUserInput } from './SwapWidget.types';

export function recalcAmountAndPrice(
	fromCurrency: Currency,
	fromAmount: string,
	toCurrency: Currency,
	toAmount: string,
	lastInput: LastUserInput
) {
	if (!get(oracle_box) || !get(bank_box)) return;
	const fromToken = fromCurrency.tokens[0];
	const toToken = toCurrency.tokens[0];
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
