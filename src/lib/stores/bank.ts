import { writable } from 'svelte/store';

export const reserve_rate = writable<number>(0);
export const reserve_boarder_left = writable<number>(0);
export const reserve_boarder_right = writable<number>(0);
