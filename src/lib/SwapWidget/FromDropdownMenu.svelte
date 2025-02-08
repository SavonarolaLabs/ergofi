<script lang="ts">
	import SwapWidgetTokenRow from '$lib/SwapWidgetTokenRow.svelte';
	import type { Currency } from './SwapWidget.types';

	export let fromBtnRect: { top: number; left: number; width: number };
	export let fromCurrencies: Currency[];
	export let onSelect: (currency: Currency) => void;
</script>

<div
	id="fromDropdownMenu"
	class="border-color absolute z-30 border-4 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
	style="
			width: 250px;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
			left: {fromBtnRect.left}px;
			top: {fromBtnRect.top - 4}px;
			border-right: none;
		"
>
	<div>
		{#each fromCurrencies as c, i}
			<button
				class="text-md flex w-full items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-600 hover:text-white"
				style="height:56px"
				on:click={() => onSelect(c)}
			>
				<SwapWidgetTokenRow {c} />
			</button>

			{#if i !== fromCurrencies.length - 1}
				<hr class="border-slate-800" />
			{/if}
		{/each}
	</div>
</div>

<style>
	.border-color {
		border-color: #16151f;
	}
</style>
