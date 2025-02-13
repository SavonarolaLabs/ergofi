import { get, writable, type Writable } from 'svelte/store';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBankFreeMintBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseTrackingBox
} from './dexyGoldParser';
import { DEXY_GOLD } from '$lib/dexygold/dexyConstants';
import { info } from './nodeInfo';
import { FEE_UI, FEE_UI_DENOM } from '$lib/sigmausd/sigmaUSDAndDexy';

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

export const dexygold_widget_numbers: Writable<DexyGoldNumbers> = writable();

export type DexyGoldNumbers = {
	bankAvailableDexy: bigint;
	lpAvailabeDexy: bigint;
	lpAvailabeErg: bigint;
	lpRate: bigint;
	oracleRate: bigint;
	oracleRateWithBankAndUiFees: bigint;
	bankFreeMintExchangeRate: number;
	bankFreeMintActivationRate: bigint;
	bankFreeMintResetHeight: bigint;
	bankFreeMintAvailableDexy: bigint;
	bankFreeMintR5RemainingDexy: bigint;
	bankFreeMintResetDexy: bigint;
	bankArbMintExchangeRate: number;
	bankArbMintActivationRate: bigint;
	bankArbMintResetHeight: bigint;
	bankArbMintActivationHeight: bigint; //Tracking 101 height + T_arb
	bankArbMintAvailableDexy: bigint;
	bankArbMintR5RemainingDexy: bigint;
	bankArbMintResetDexy: bigint;
	tracking101TriggerHeight: bigint;
	isBankArbMintActivationHeightTriggered: boolean;
	isBankArbMintActive: boolean;
	isBankFreeMintActive: boolean;
};

export function calculateDexyGoldNumbers() {
	const height = get(info).fullHeight;
	const arbMintIn = get(dexygold_bank_arbitrage_mint_box);
	const { R4ResetHeight: bankArbMintResetHeight, R5AvailableAmount: bankArbMintR5RemainingDexy } =
		parseBankArbitrageMintBox(arbMintIn);

	const freeMintIn = get(dexygold_bank_free_mint_box);
	const { R4ResetHeight: bankFreeMintResetHeight, R5AvailableAmount: bankFreeMintR5RemainingDexy } =
		parseBankFreeMintBox(freeMintIn);

	const bankIn = get(dexygold_bank_box);
	const { dexyAmount: bankAvailableDexy } = parseBankBox(bankIn);

	const lpIn = get(dexygold_lp_box);
	const { dexyAmount: lpYIn, value: lpXIn, lpTokenAmount } = parseLpBox(lpIn);

	const goldOracle = get(oracle_erg_xau_box);
	const { R4Rate: oracleRate } = parseDexyGoldOracleBox(goldOracle);

	const tracking101 = get(dexygold_tracking101_box);
	const { R7TriggeredHeight: tracking101TriggerHeight } = parseTrackingBox(tracking101);

	const bankFreeMintResetDexy = lpYIn / 100n; //free

	const oracleRateXy = oracleRate / 1_000_000n; //<== 1_000_000
	const bankRate =
		(oracleRateXy * (DEXY_GOLD.bankFeeNum + DEXY_GOLD.feeDenom)) / DEXY_GOLD.feeDenom;
	const buybackRate = (oracleRateXy * DEXY_GOLD.bankFeeNum) / DEXY_GOLD.feeDenom;
	const oracleRateWithFee = bankRate + buybackRate;

	const bankArbMintResetDexy = (lpXIn - oracleRateWithFee * lpYIn) / oracleRateWithFee; //arb

	const bankArbMintActivationRate = (101n * oracleRateWithFee) / 100n;
	const bankFreeMintActivationRate = (oracleRateXy * 98n) / 100n;

	const lpRateXy = lpXIn / lpYIn;
	const isBankArbMintActivationRateTriggered = lpRateXy * 100n > 101n * oracleRateWithFee;
	const isBankFreeMintActivationRateTriggered = lpRateXy * 100n > 98n * oracleRateXy;

	const bankArbMintActivationHeight = BigInt(tracking101TriggerHeight) + DEXY_GOLD.T_arb;
	const isBankArbMintActivationHeightTriggered =
		height > BigInt(tracking101TriggerHeight) + DEXY_GOLD.T_arb;
	const isBankArbMintActive =
		isBankArbMintActivationRateTriggered && isBankArbMintActivationHeightTriggered;
	const isBankFreeMintActive = isBankFreeMintActivationRateTriggered;

	const bankFreeMintExchangeRate = -666;
	const bankArbMintExchangeRate = -666;

	const oracleRateBankFees =
		(oracleRateXy * (DEXY_GOLD.feeDenom + DEXY_GOLD.bankFeeNum + DEXY_GOLD.buybackFeeNum)) /
		DEXY_GOLD.feeDenom;
	const oracleRateWithBankAndUiFees = ((FEE_UI_DENOM + FEE_UI) * oracleRateBankFees) / FEE_UI_DENOM;

	const bankFreeMintAvailableDexy =
		bankFreeMintResetHeight > height ? bankFreeMintR5RemainingDexy : bankFreeMintResetDexy;
	const bankArbMintAvailableDexy =
		bankArbMintResetHeight > height ? bankArbMintR5RemainingDexy : bankArbMintResetDexy;

	dexygold_widget_numbers.set({
		bankAvailableDexy,
		lpAvailabeDexy: lpYIn,
		lpAvailabeErg: lpXIn,
		lpRate: lpRateXy,
		oracleRate: oracleRateXy,
		oracleRateWithBankAndUiFees,
		bankFreeMintExchangeRate,
		bankFreeMintActivationRate,
		bankFreeMintResetHeight,
		bankFreeMintAvailableDexy,
		bankFreeMintR5RemainingDexy,
		bankFreeMintResetDexy,
		bankArbMintExchangeRate,
		bankArbMintActivationRate,
		bankArbMintResetHeight,
		bankArbMintActivationHeight,
		bankArbMintAvailableDexy,
		bankArbMintR5RemainingDexy,
		bankArbMintResetDexy,
		tracking101TriggerHeight,
		isBankArbMintActivationHeightTriggered,
		isBankArbMintActive,
		isBankFreeMintActive
	});
}
