import { writable } from 'svelte/store';

export const reserve_rate = writable<number>(0);
export const reserve_boarder_left_USD = writable<number>(0);
export const reserve_boarder_left_ERG = writable<number>(0);
export const reserve_boarder_right_USD = writable<number>(0);
export const reserve_boarder_right_ERG = writable<number>(0);

export const bankBoxInErg = writable<bigint>(1653105734759386n);
export const bankBoxInCircSigUsd = writable<bigint>(46260638n);
export const oraclePriceSigUsd = writable<bigint>(5405405n);

export const unconfirmed_bank_erg = writable<bigint>(1653105734759386n);
export const unconfrimed_bank_usd = writable<bigint>(46260638n);
export const unconfrimed_bank_ratio = writable<bigint>(400n);
