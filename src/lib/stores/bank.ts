import type { Output } from '$lib/api/ergoNode';
import { get, writable } from 'svelte/store';

export const reserve_rate = writable<number>(0);
export const reserve_boarder_left_USD = writable<number>(0);
export const reserve_boarder_left_ERG = writable<number>(0);
export const reserve_boarder_right_USD = writable<number>(0);
export const reserve_boarder_right_ERG = writable<number>(0);

export const bankBoxInErg = writable<bigint>(1653105734759386n);
export const bankBoxInCircSigUsd = writable<bigint>(46260638n);
export const oraclePriceSigUsd = writable<bigint>(5405405n);
export const bank_price_usd_buy = writable<number>(0);
export const bank_price_usd_sell = writable<number>(0);

export const unconfirmed_bank_erg = writable<bigint>(1653105734759386n);
export const unconfrimed_bank_usd = writable<bigint>(46260638n);
export const unconfrimed_reserve_boarder_left_USD = writable<number>(0);
export const unconfrimed_bank_reserve_rate = writable<bigint>(400n);

export const fee_mining = writable<bigint>(10_000_000n); //0.01 ERG

export const oracle_box = writable<Output>();
export const bank_box = writable<Output>();

type ErgoBox = {
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
};

export function handleOracleBoxesUpdate(message: OracleData) {
	if (message.confirmed_erg_usd.length > 0) {
		if (get(oracle_box)?.boxId == message.confirmed_erg_usd[0].boxId) return;
		oracle_box.set(message.confirmed_erg_usd[0]);
	}
}
