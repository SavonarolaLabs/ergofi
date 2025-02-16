<script lang="ts">
	import WidgetOptionRow from './WidgetOptionRow.svelte';
	import type { SwapOption } from './swapOptions';
	import { onMount } from 'svelte';

	export let id: string = 'dropdownMenu';
	export let btnRect: { top: number; left: number; width: number };
	export let options: SwapOption[];
	export let onSelect: (selected: SwapOption) => void;
	export let open: boolean;
	export let onClose: () => void;

	function handleGlobalClick(e: MouseEvent) {
		const menu = document.getElementById('dropdownMenu');
		if (menu && !menu.contains(e.target as Node)) {
			onClose();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		window.addEventListener('click', handleGlobalClick);
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('click', handleGlobalClick);
			window.removeEventListener('keydown', handleGlobalKeydown);
		};
	});

	function selectOption(option: SwapOption) {
		onSelect(option);
	}
</script>

{#if open}
	<div
		{id}
		class="border-color absolute z-30 border-4 bg-[var(--cl-bg-widget)] shadow-md ring-1 ring-black ring-opacity-5"
		style="
		width: {btnRect.width}px;
		left: {btnRect.left}px;
		top: {btnRect.top - 4}px;
	"
	>
		<div>
			{#each options as option}
				<button
					class="text-md flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-600 hover:text-white"
					style="height:56px"
					on:click={() => selectOption(option)}
				>
					<WidgetOptionRow {option} />
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
</style>
