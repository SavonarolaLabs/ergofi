import { get, writable } from 'svelte/store';
import type { Interaction, MempoolSocketUpdate } from './preparedInteractions';
import { getMaxFeeLeaf } from './bankBoxSelection';
import type { NodeBox, OracleData } from './bank.types';
import { calculateReserveRateAndBorders } from '$lib/sigmausd/sigmaUSDBankWidget';
import { calculateBankPrices } from '$lib/sigmausd/sigmaUSDInputRecalc';
import { parseErgUsdOracleBox, parseSigUsdBankBox } from '$lib/sigmausd/sigmaUSDParser';

export const reserve_rate = writable<number>(0);
export const reserve_border_left_USD = writable<number>(0);
export const reserve_border_left_ERG = writable<number>(0);
export const reserve_border_left_RSV = writable<number>(0);
export const reserve_border_right_USD = writable<number>(0);
export const reserve_border_right_ERG = writable<number>(0);
export const reserve_border_right_RSV = writable<number>(0);

export const bank_box_nano_erg = writable<bigint>(1653105734759386n);
export const bank_box_circulating_usd_cent = writable<bigint>(46260638n);
export const bank_box_circulating_rsv = writable<bigint>(46260638n);
export const oracle_price_sig_usd_cent = writable<bigint>(5405405n);
export const bank_price_usd_buy = writable<number>(0);
export const bank_price_usd_sell = writable<number>(0);
export const bank_price_rsv_buy = writable<number>(0);
export const bank_price_rsv_sell = writable<number>(0);

export const unconfirmed_bank_erg = writable<bigint>(1653105734759386n);
export const unconfrimed_bank_usd = writable<bigint>(46260638n);
export const unconfrimed_reserve_border_left_USD = writable<number>(0);
export const unconfrimed_reserve_border_right_RSV = writable<number>(0);
export const unconfrimed_bank_reserve_rate = writable<bigint>(400n);

//export const fee_mining = writable<bigint>(10_000_000n); //0.01 ERG
export const fee_mining = writable<bigint>(1_100_000n); //0.0011 ERG

// sigmausd
export const oracle_box = writable<NodeBox>();
export const bank_box = writable<NodeBox>();
// dexygold
export const dexOLDygold_lp_box = writable<NodeBox>();
export const ergOLD_xau_box = writable<NodeBox>();

export function handleOracleBoxesUpdate(message: OracleData) {
	// if (message.unconfirmed_erg_usd.length > 0) {
	// 	if (get(oracle_box)?.boxId == message.unconfirmed_erg_usd[0].boxId) return;
	// 	oracle_box.set(message.unconfirmed_erg_usd[0]);
	// } else
	if (message.confirmed_erg_usd.length > 0) {
		if (get(oracle_box)?.boxId == message.confirmed_erg_usd[0].boxId) return;
		oracle_box.set(message.confirmed_erg_usd[0]);
	}
	if (message.confirmed_erg_xau.length > 0) {
		if (get(ergOLD_xau_box)?.boxId == message.confirmed_erg_xau[0].boxId) return;
		ergOLD_xau_box.set(message.confirmed_erg_xau[0]);
	}
	if (message.confirmed_dexygold_lp.length > 0) {
		if (get(dexOLDygold_lp_box)?.boxId == message.confirmed_dexygold_lp[0].boxId) return;
		dexOLDygold_lp_box.set(message.confirmed_dexygold_lp[0]);
	}
}

export function updateBestBankBox(
	payload: MempoolSocketUpdate,
	preparedInteractions: Interaction[]
) {
	const preparedTxs = preparedInteractions
		.filter((i) => i.transactionId && !i.rejected)
		.map((i) => i.tx);
	const txList = [
		...(payload.history?.[0] ? [payload.history[0]] : []),
		...(payload.confirmed_transactions?.[0] ? [payload.confirmed_transactions[0]] : []),
		...payload.unconfirmed_transactions,
		...preparedTxs
	];
	if (txList.length < 1) return;

	let bankBox = getMaxFeeLeaf(txList);
	if (bankBox && get(bank_box)?.boxId != bankBox.boxId) {
		bank_box.set(bankBox);
	}
}

export function updateBestBankBoxLocal(
	confirmedInteractions: Interaction[],
	mempoolInteractionts: Interaction[],
	preparedInteractions: Interaction[]
) {
	const txList = [
		...confirmedInteractions.map((i) => i.tx).slice(0, 1),
		...mempoolInteractionts.map((i) => i.tx),
		...preparedInteractions.map((i) => i.tx)
	];
	if (txList.length < 1) return;

	let bankBox = getMaxFeeLeaf(txList);
	if (bankBox && get(bank_box)?.boxId != bankBox.boxId) {
		bank_box.set(bankBox);
	}
}

// Used in SwapWidget.svelte

export function updateBankBoxAndOracle(oracleBox: NodeBox, bankBox: NodeBox) {
	const { inErg, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
	const { oraclePrice } = parseErgUsdOracleBox(oracleBox);
	bank_box_nano_erg.set(inErg);
	bank_box_circulating_usd_cent.set(inCircSigUSD);
	bank_box_circulating_rsv.set(inCircSigRSV);
	oracle_price_sig_usd_cent.set(oraclePrice);
}

export function updateBankPrices() {
	const calc = calculateBankPrices(
		get(bank_box_nano_erg),
		get(bank_box_circulating_usd_cent),
		get(bank_box_circulating_rsv),
		get(oracle_price_sig_usd_cent),
		get(fee_mining)
	);
	bank_price_usd_buy.set(calc.bankPriceUsdBuy);
	bank_price_usd_sell.set(calc.bankPriceUsdSell);
	bank_price_rsv_buy.set(calc.bankPriceRsvBuy);
	bank_price_rsv_sell.set(calc.bankPriceRsvSell);
}

export function updateBankStats() {
	const calc = calculateReserveRateAndBorders(
		get(bank_box_nano_erg),
		get(bank_box_circulating_usd_cent),
		get(oracle_price_sig_usd_cent),
		get(bank_price_rsv_buy),
		get(bank_price_rsv_sell)
	);

	reserve_rate.set(calc.reserveRate);
	reserve_border_left_USD.set(calc.leftUSD);
	reserve_border_left_ERG.set(calc.leftERG);
	reserve_border_right_USD.set(calc.rightUSD);
	reserve_border_right_ERG.set(calc.rightERG);
	reserve_border_left_RSV.set(calc.leftRSV);
	reserve_border_right_RSV.set(calc.rightRSV);
}
