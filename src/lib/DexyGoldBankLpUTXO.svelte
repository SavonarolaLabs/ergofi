<script lang="ts">
	import { onMount } from 'svelte';
	import { calculateDexyGoldWidgetNumbers, dexygold_widget_numbers } from './stores/dexyGoldStore';
	import { initJsonTestBoxes } from './stores/dexyGoldStoreJsonTestData';

	export let confirmed = true;

	onMount(() => {
		initJsonTestBoxes();
		calculateDexyGoldWidgetNumbers();
	});
</script>

<div class="text-sm">
	{#if $dexygold_widget_numbers}
		{#each Object.entries($dexygold_widget_numbers) as [o, e]}
			<div>{e}:{o}</div>
		{/each}
	{/if}
</div>

<style>
	.row {
		padding-left: 1rem;
		padding-right: 1rem;
	}
	.currency {
		width: 60px;
		text-align: left;
		margin-left: 0.5em;
	}
	.price-left {
		width: 110px;
	}
</style>
