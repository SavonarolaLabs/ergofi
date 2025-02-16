<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { ArrowDown, ArrowUpDown } from 'lucide-svelte';

	export let top = -13;

	let currencySwapHovered = false;
	const dispatch = createEventDispatcher();

	function handleMouseEnter() {
		currencySwapHovered = true;
	}

	function handleMouseLeave() {
		currencySwapHovered = false;
	}

	function dispatchSwap() {
		dispatch('swap');
	}
</script>

<div class="relative" style="height:4px;">
	<div class="absolute" style="z-index:5;margin-top:{top}px; left:180px">
		<button
			on:mouseenter={handleMouseEnter}
			on:mouseleave={handleMouseLeave}
			on:click={dispatchSwap}
			class="border-color flex items-center justify-center rounded-full border-4 bg-[var(--cl-bg-widget)] px-1 py-1 hover:[&>svg:first-child]:hidden hover:[&>svg:last-child]:block"
			style="width:42px;height:42px;height: 30px; border-radius: 8px;"
		>
			{#if currencySwapHovered}
				<ArrowUpDown size={18} />
			{:else}
				<ArrowDown size={18} />
			{/if}
		</button>
	</div>
</div>
