import { writable } from 'svelte/store';

export const reserve_rate = writable<number>(0);
export const reserve_boarder_left_USD = writable<number>(0);
export const reserve_boarder_left_ERG = writable<number>(0);
export const reserve_boarder_right_USD = writable<number>(0);
export const reserve_boarder_right_ERG = writable<number>(0);
