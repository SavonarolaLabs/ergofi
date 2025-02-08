<script lang="ts">
	import SwapWidgetTokenRow from '$lib/SwapWidgetTokenRow.svelte';
	import { currencyERG, getAllowedToCurrencies } from './currency';
	import type { Currency } from './SwapWidget.types';

	export let toBtnRect: { top: number; left: number; width: number };
	export let toCurrencies: Currency[];
	export let onSelect: (currency: Currency) => void;
</script>

<div
	id="toDropdownMenu"
	style="width: 250px; border-top-left-radius:0px; border-top-right-radius:0px;
left: {toBtnRect.left}px;
top:{toBtnRect.top - 4}px; border-right:none"
	class="border-color absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
>
	<div>
		{#each toCurrencies as c, i}
			<button
				class="text-md flex w-full items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-600 hover:text-white"
				style="height:56px"
				on:click={() => onSelect(c)}
			>
				<SwapWidgetTokenRow {c} />
			</button>

			{#if i !== toCurrencies.length - 1}
				<hr class="border-slate-800" />
			{/if}
		{/each}
	</div>
</div>

<style>
</style>
