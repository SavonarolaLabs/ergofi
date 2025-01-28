<script lang="ts">
	import Tint from './icons/Tint.svelte';

	export let c: {
		isLpPool?: boolean;
		isLpToken?: boolean;
		tokens: string[];
	};

	function tokenColor(ticker: string) {
		return {
			ERG: 'bg-orange-500',
			SigUSD: 'bg-green-500',
			SigRSV: 'bg-[#4A90E2]',
			DexyGold: 'bg-[yellow]'
		}[ticker];
	}
</script>

{#if c.isLpPool || c.isLpToken}
	<div class="flex w-full items-center justify-between text-sm">
		<div class="pl-1">
			<div class="flex items-center gap-4">
				<div class={`h-3 w-3 flex-shrink-0 ${tokenColor(c.tokens[0])} rounded-full`}></div>
				{c.tokens[0]}
			</div>
			<div class="flex items-center gap-4">
				<div class={`h-3 w-3 flex-shrink-0 ${tokenColor(c.tokens[1])} rounded-full`}></div>
				{c.tokens[1]}
			</div>
		</div>

		<div class="flex gap-2">
			<Tint></Tint>
			<div class="text-center">
				<div class="text-xs">Liquidity</div>
				<div class="text-xs">{c.isLpToken ? 'Token' : 'Pool'}</div>
			</div>
		</div>
	</div>
{:else}
	<div class={`h-5 w-5 flex-shrink-0 ${tokenColor(c.tokens[0])} rounded-full`}></div>
	{c.tokens[0]}
{/if}

<style>
	/* Add your styles here if necessary */
</style>
