<script lang="ts">
	import WidgetOptionRow from './WidgetOptionRow.svelte';
	import type { SwapOption } from './currency';

	export let btnRect: { top: number; left: number; width: number };
	export let options: SwapOption[];
	export let onSelect: (selectedInputOption: SwapOption) => void;
</script>

<div
	id="fromDropdownMenu"
	class="border-color absolute z-30 border-4 bg-[var(--cl-bg-widget)] shadow-md ring-1 ring-black ring-opacity-5"
	style="
			width: 250px;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
			left: {btnRect.left}px;
			top: {btnRect.top - 4}px;
		"
>
	<div>
		{#each options as option, i}
			<button
				class="text-md flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-600 hover:text-white"
				style="height:56px"
				on:click={() => onSelect(option)}
			>
				<WidgetOptionRow {option} />
			</button>
		{/each}
	</div>
</div>

<style>
</style>
