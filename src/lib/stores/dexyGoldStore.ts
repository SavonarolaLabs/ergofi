import { writable } from 'svelte/store';

export const dexygold_lp_box = writable<any>();
export const oracle_erg_xau_box = writable<any>();

export const dexygold_tracking95_box = writable<any>();
export const dexygold_tracking98_box = writable<any>();
export const dexygold_tracking101_box = writable<any>();
export const dexygold_bank_box = writable<any>();
export const dexygold_bank_free_mint_box = writable<any>();
export const dexygold_bank_arbitrage_mint_box = writable<any>();
export const dexygold_bank_intervention_box = writable<any>();
export const dexygold_bank_payout_box = writable<any>();
export const dexygold_buyback_box = writable<any>();
export const dexygold_lp_mint_box = writable<any>();
export const dexygold_lp_redeem_box = writable<any>();
export const dexygold_lp_extract_box = writable<any>();
export const dexygold_lp_swap_box = writable<any>();

export const dexygold_widget_numbers = writable<DexyGoldWidgetNumbers>();

type DexyGoldWidgetNumbers = {
	bankAvailableDexy: bigint;
	lpAvailabeDexy: bigint;
	lpAvailabeErg: bigint;
	lpRate: number;
	oracleRate: number;

	bankFreeMintExchangeRate: number;
	bankFreeMintActivationRate: number;
	bankFreeMintResetHeight: number;
	bankFreeMintAvailableDexy: bigint;
	bankFreeMintResetDexy: bigint;

	bankArbMintExchangeRate: number;
	bankArbMintActivationRate: number;
	bankArbMintResetHeight: number;
	bankArbMintActivationHeight: number; //Tracking 101 height + T_arb
	bankArbMintAvailableDexy: bigint;
	bankArbMintResetDexy: bigint;

	tracking101TriggerHeight: number;
};
