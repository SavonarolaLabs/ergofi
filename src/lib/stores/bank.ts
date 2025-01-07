import type { Output } from '$lib/api/ergoNode';
import { writable } from 'svelte/store';

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
