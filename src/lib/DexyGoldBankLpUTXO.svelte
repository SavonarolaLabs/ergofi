<script lang="ts">
	import { onMount } from 'svelte';
	import Bank from './icons/Bank.svelte';
	import Tint from './icons/Tint.svelte';
	import Spinner from './Spinner.svelte';
	import {
		bank_price_rsv_buy,
		bank_price_rsv_sell,
		bank_price_usd_buy,
		bank_price_usd_sell,
		bank_box_nano_erg,
		oracle_price_sig_usd_cent,
		reserve_border_left_USD,
		reserve_border_right_RSV,
		reserve_rate
	} from './stores/bank';
	import SubNumber from './SubNumber.svelte';
	import { formatAmount, nanoErgToErg, oracleRateToUsd } from './utils';
	import { calculateDexyGoldWidgetNumbers, dexygold_widget_numbers } from './stores/dexyGoldStore';
	import { initJsonTestBoxes } from './stores/dexyGoldStoreJsonTestData';
	import { entries } from 'lodash-es';

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
