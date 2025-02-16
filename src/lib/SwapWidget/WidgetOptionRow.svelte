<script lang="ts">
	import Tint from '../icons/Tint.svelte';
	import type { SwapOption } from './currency';

	export let option: SwapOption;

	function tokenColor(ticker: string) {
		return {
			ERG: 'bg-orange-500',
			SigUSD: 'bg-green-500',
			SigRSV: 'bg-[#4A90E2]',
			DexyGold: 'bg-[yellow]'
		}[ticker];
	}
</script>

{#if option.item}
	<div class={`h-5 w-5 flex-shrink-0 ${tokenColor(option.item.ticker)} rounded-full`}></div>
	{option.item.ticker}
{:else}
	<div class="flex w-full items-center justify-between text-sm">
		<div class="pl-1">
			{#each option.intention.filter((i) => 'input' == i.side) as swapItem}
				<div class="flex items-center gap-4">
					<div class={`h-3 w-3 flex-shrink-0 ${tokenColor(swapItem.ticker)} rounded-full`}></div>
					{swapItem.ticker}
				</div>
			{/each}
		</div>

		<div class="flex gap-2">
			<Tint></Tint>
			<div class="text-center">
				<div class="text-xs">Liquidity</div>
				<div class="text-xs">Token</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add your styles here if necessary */
</style>
