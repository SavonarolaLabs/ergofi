import { get, writable } from 'svelte/store';
import type { Interaction, MempoolSocketUpdate } from './preparedInteractions';
import { getMaxFeeLeaf } from './bankBoxSelection';

export const reserve_rate = writable<number>(0);
export const reserve_border_left_USD = writable<number>(0);
export const reserve_border_left_ERG = writable<number>(0);
export const reserve_border_left_RSV = writable<number>(0);
export const reserve_border_right_USD = writable<number>(0);
export const reserve_border_right_ERG = writable<number>(0);
export const reserve_border_right_RSV = writable<number>(0);

export const bankBoxInNanoErg = writable<bigint>(1653105734759386n);
export const bankBoxInCircSigUsdInCent = writable<bigint>(46260638n);
export const bankBoxInCircSigRsv = writable<bigint>(46260638n);
export const oraclePriceSigUsd = writable<bigint>(5405405n);
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
export const oracle_box = writable<ErgoBox>();
export const bank_box = writable<ErgoBox>();
// dexygold
export const dexygold_lp_box = writable<ErgoBox>();
export const erg_xau_box = writable<ErgoBox>();

export type ErgoBox = {
	additionalRegisters: Record<string, string>;
	address: string;
	assets: {
		amount: number;
		tokenId: string;
	}[];
	boxId: string;
	creationHeight: number;
	ergoTree: string;
	globalIndex: number;
	inclusionHeight: number;
	index: number;
	spentTransactionId: string | null;
	transactionId: string;
	value: number;
};

type OracleData = {
	confirmed_erg_usd: ErgoBox[];
	confirmed_erg_xau: ErgoBox[];
	unconfirmed_erg_usd: ErgoBox[];
	unconfirmed_erg_xau: ErgoBox[];
	confirmed_dexygold_lp: ErgoBox[];
	unconfirmed_dexygold_lp: ErgoBox[];
};

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
		if (get(erg_xau_box)?.boxId == message.confirmed_erg_xau[0].boxId) return;
		erg_xau_box.set(message.confirmed_erg_xau[0]);
	}
	if (message.confirmed_dexygold_lp.length > 0) {
		if (get(dexygold_lp_box)?.boxId == message.confirmed_dexygold_lp[0].boxId) return;
		dexygold_lp_box.set(message.confirmed_dexygold_lp[0]);
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
		//...(payload.history?.[0] ? [payload.history[0]] : []),
		//...payload.history,
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
