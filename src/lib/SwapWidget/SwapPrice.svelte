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

	function calculatePrice(swapIntent: SwapIntention) {
		if (swapIntent.length == 2) {
			const inputIndex = swapIntent.findIndex((s) => s.side == 'input');
			const outputIndex = swapIntent.findIndex((s) => s.side == 'output');
			const inMultiplicator = 10 ** ergoTokens[swapIntent[inputIndex].tokenId].decimals; //input?
			const outMultiplicator = 10 ** ergoTokens[swapIntent[outputIndex].tokenId].decimals; //output?

			const price = BigNumber(swapIntent[outputIndex].amount)
				.dividedBy(outMultiplicator)
				.dividedBy(swapIntent[inputIndex].amount)
				.multipliedBy(inMultiplicator)
				.toNumber();
			//getTokenId(ticker
			return price;
		} else {
			const lpIndex = swapIntent.findIndex((s) => s.tokenId == DEXY_GOLD.lpTokenId);
			const ergIndex = swapIntent.findIndex((s) => s.tokenId == ERGO_TOKEN_ID);
			const lpMultiplicator = 10 ** ergoTokens[swapIntent[lpIndex].tokenId].decimals; //input?
			const ergMultiplicator = 10 ** ergoTokens[swapIntent[ergIndex].tokenId].decimals; //output?

			const price = BigNumber(swapIntent[lpIndex].amount)
				.dividedBy(lpMultiplicator)
				.dividedBy(swapIntent[ergIndex].amount)
				.multipliedBy(ergMultiplicator);

			if (swapIntent[lpIndex].side == 'output') {
				return price.toNumber();
			} else {
				return BigNumber(1).dividedBy(price).toNumber();
			}
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
