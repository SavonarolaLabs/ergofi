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
		<div>{$dexygold_widget_numbers.bankAvailableDexy} bankAvailableDexy</div>
		<div>{$dexygold_widget_numbers.lpAvailabeDexy} lpAvailabeDexy</div>
		<div>{$dexygold_widget_numbers.lpAvailabeErg / 10n ** 9n} lpAvailabeErg</div>
		<div>{$dexygold_widget_numbers.lpRate} lpRate</div>
		<div class="mb-1"></div>
		<div>{$dexygold_widget_numbers.bankFreeMintActivationRate} bankFreeMintActivationRate</div>
		<div>{$dexygold_widget_numbers.oracleRate} oracleRate</div>
		<div>{$dexygold_widget_numbers.bankArbMintActivationRate} bankArbMintActivationRate</div>
		<div class="mb-1"></div>
		<div>{$dexygold_widget_numbers.bankFreeMintExchangeRate} bankFreeMintExchangeRate</div>
		<div>{$dexygold_widget_numbers.bankFreeMintResetHeight} bankFreeMintResetHeight</div>
		<div>{$dexygold_widget_numbers.bankFreeMintAvailableDexy} bankFreeMintAvailableDexy</div>
		<div>{$dexygold_widget_numbers.bankFreeMintResetDexy} bankFreeMintResetDexy</div>
		<div>{$dexygold_widget_numbers.bankArbMintExchangeRate} bankArbMintExchangeRate</div>
		<div>{$dexygold_widget_numbers.bankArbMintResetHeight} bankArbMintResetHeight</div>
		<div>{$dexygold_widget_numbers.bankArbMintActivationHeight} bankArbMintActivationHeight</div>
		<div>{$dexygold_widget_numbers.bankArbMintAvailableDexy} bankArbMintAvailableDexy</div>
		<div>{$dexygold_widget_numbers.bankArbMintResetDexy} bankArbMintResetDexy</div>
		<div>{$dexygold_widget_numbers.tracking101TriggerHeight} tracking101TriggerHeight</div>
		<div>
			{$dexygold_widget_numbers.isBankArbMintActivationHeightTriggered} isBankArbMintActivationHeightTriggered
		</div>
		<div>{$dexygold_widget_numbers.isBankArbMintActive} isBankArbMintActive</div>
		<div>{$dexygold_widget_numbers.isBankFreeMintActive} isBankFreeMintActive</div>
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
