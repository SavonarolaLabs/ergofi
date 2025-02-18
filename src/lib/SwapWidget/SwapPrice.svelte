<script lang="ts">
	import { sigmausd_numbers } from '$lib/stores/bank';
	import SubNumber from '$lib/SubNumber.svelte';
	import { outputTicker, inputTicker } from '$lib/swapIntention';
	import BigNumber from 'bignumber.js';
	import { getToLabel, isSwapDisabledCalc } from './swapWidgetUtils';
	import type { SwapIntention } from '$lib/swapIntention';
	import { ergoTokens } from '$lib/stores/ergoTokens';

	export let swapIntent;

	function calculatePrice(swapIntent: SwapIntention) {
		console.log(swapIntent);
		if (swapIntent.length == 2) {
			const inputIndex = 0;
			const outputIndex = 1;
			const inDecimals = ergoTokens[swapIntent[inputIndex].tokenId].decimals; //input?
			const outDecimals = ergoTokens[swapIntent[outputIndex].tokenId].decimals; //output?

			const price = BigNumber(swapIntent[outputIndex].amount)
				.dividedBy(outDecimals)
				.dividedBy(swapIntent[inputIndex].amount)
				.multipliedBy(inDecimals)
				.toString();
			//getTokenId(ticker
			console.log('price', price);
			return price;
		} else {
			console.log('Price else: To Do');
			return 0;
		}
		// b/a
	}
</script>

{#if $sigmausd_numbers}
	<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
		<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabledCalc(swapIntent)}>
			{getToLabel(swapIntent)}</span
		>
		<span class="text-sm">
			{swapIntent[0].amount}
			<SubNumber value={calculatePrice(swapIntent)}></SubNumber>
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
