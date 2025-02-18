<script lang="ts">
	import { sigmausd_numbers } from '$lib/stores/bank';
	import SubNumber from '$lib/SubNumber.svelte';
	import { outputTicker, inputTicker } from '$lib/swapIntention';
	import BigNumber from 'bignumber.js';
	import { getToLabel, isSwapDisabledCalc } from './swapWidgetUtils';
	import type { SwapIntention } from '$lib/swapIntention';
	import { ERGO_TOKEN_ID, ergoTokens } from '$lib/stores/ergoTokens';
	import { DEXY_GOLD } from '$lib/dexygold/dexyConstants';

	export let swapIntent;
	let direction: boolean = true;
	let firstTicker: string = '';
	let lastTicker: string = '';

	function getFirstTicker(swapIntent: SwapIntention, direct: boolean = true) {
		if (swapIntent.length == 2) {
			const inputIndex = swapIntent.findIndex((s) => s.side == 'input');
			const outputIndex = swapIntent.findIndex((s) => s.side == 'output');
			if (direct) {
				firstTicker = swapIntent[inputIndex].ticker;
				lastTicker = swapIntent[outputIndex].ticker;
			} else {
				firstTicker = swapIntent[outputIndex].ticker;
				lastTicker = swapIntent[inputIndex].ticker;
			}
		} else {
			const lpIndex = swapIntent.findIndex((s) => s.tokenId == DEXY_GOLD.lpTokenId);
			const ergIndex = swapIntent.findIndex((s) => s.tokenId == ERGO_TOKEN_ID);

			if (
				(swapIntent[lpIndex].side == 'output' && direct) ||
				(swapIntent[lpIndex].side == 'input' && !direct)
			) {
				firstTicker = swapIntent[ergIndex].ticker;
				lastTicker = 'LP'; // swapIntent[lpIndex].ticker;
			} else {
				firstTicker = 'LP'; // swapIntent[lpIndex].ticker;
				lastTicker = swapIntent[ergIndex].ticker;
			}
		}
	}

	function getLastTicker(swapIntent: SwapIntention, direct: boolean = true): string {
		return 'NOT ERG';
	}

	function calculatePrice(swapIntent: SwapIntention, direct: boolean = true) {
		let price;
		if (swapIntent.length == 2) {
			const inputIndex = swapIntent.findIndex((s) => s.side == 'input');
			const outputIndex = swapIntent.findIndex((s) => s.side == 'output');
			const inMultiplicator = 10 ** ergoTokens[swapIntent[inputIndex].tokenId].decimals; //input?
			const outMultiplicator = 10 ** ergoTokens[swapIntent[outputIndex].tokenId].decimals; //output?

			price = BigNumber(swapIntent[outputIndex].amount)
				.dividedBy(outMultiplicator)
				.dividedBy(swapIntent[inputIndex].amount)
				.multipliedBy(inMultiplicator);

			//getTokenId(ticker
		} else {
			const lpIndex = swapIntent.findIndex((s) => s.tokenId == DEXY_GOLD.lpTokenId);
			const ergIndex = swapIntent.findIndex((s) => s.tokenId == ERGO_TOKEN_ID);
			const lpMultiplicator = 10 ** ergoTokens[swapIntent[lpIndex].tokenId].decimals; //input?
			const ergMultiplicator = 10 ** ergoTokens[swapIntent[ergIndex].tokenId].decimals; //output?

			price = BigNumber(swapIntent[lpIndex].amount)
				.dividedBy(lpMultiplicator)
				.dividedBy(swapIntent[ergIndex].amount)
				.multipliedBy(ergMultiplicator);

			if (swapIntent[lpIndex].side == 'output') {
			} else {
				price = BigNumber(1).dividedBy(price);
			}
		}

		if (direct) {
			return price.toNumber();
		} else {
			return BigNumber(1).dividedBy(price).toNumber();
		}
	}
</script>

{#if $sigmausd_numbers}
	<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
		<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabledCalc(swapIntent)}>
			{getToLabel(swapIntent)}</span
		>
		<span class="text-sm">
			{getFirstTicker(swapIntent, direction)}1 {firstTicker} = <SubNumber
				value={calculatePrice(swapIntent, direction)}
			></SubNumber>
			{lastTicker}
		</span>
		<!-- <span class="text-sm">
			{#if outputTicker(swapIntent, 0) === 'SigRSV' || inputTicker(swapIntent, 0) === 'SigRSV'}
				<SubNumber value={1 / swapPrice}></SubNumber>
			{:else if inputTicker(swapIntent, 0) === 'ERG' && outputTicker(swapIntent, 0) === 'DexyGold'}
				1 {inputTicker(swapIntent, 0)} ≈ <SubNumber value={10 ** 9 / swapPrice}></SubNumber>
				{outputTicker(swapIntent, 0)}
			{:else if inputTicker(swapIntent, 0) === 'DexyGold' && outputTicker(swapIntent, 0) === 'ERG'}
				1 {inputTicker(swapIntent, 0)} ≈ <SubNumber value={swapPrice / 10 ** 9}></SubNumber>
				{outputTicker(swapIntent, 0)}
			{:else}
				<SubNumber value={swapPrice}></SubNumber>
			{/if}
		</span> -->
	</div>
{/if}
