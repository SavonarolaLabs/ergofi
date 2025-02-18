<script lang="ts">
	import { sigmausd_numbers } from '$lib/stores/bank';
	import SubNumber from '$lib/SubNumber.svelte';
	import { outputTicker, inputTicker } from '$lib/swapIntention';
	import BigNumber from 'bignumber.js';
	import { getToLabel, isSwapDisabledCalc } from './swapWidgetUtils';
	import type { SwapIntention } from '$lib/swapIntention';

	export let swapIntent;

	function calculatePrice(swapIntent: SwapIntention) {
		console.log(swapIntent);
		if (swapIntent[0]?.amount != undefined) {
			return BigNumber(swapIntent[0].amount).div(swapIntent[0].amount).toString();
		} else {
			return 0;
		}
	}
</script>

{#if $sigmausd_numbers}
	<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
		<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabledCalc(swapIntent)}>
			{getToLabel(swapIntent)}</span
		>
		<span class="text-sm">
			{swapIntent}<SubNumber value={calculatePrice(swapIntent)}></SubNumber>
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
