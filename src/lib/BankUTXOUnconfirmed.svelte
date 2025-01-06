<script lang="ts">
	import { writable } from 'svelte/store';
	import {
		calculateReserveRate,
		calculateReserveRateAndBorders,
		updateUnconfirmedBank
	} from './sigmaUSD';
	import Spinner from './Spinner.svelte';
	import {
		bankBoxInCircSigUsd,
		bankBoxInErg,
		oraclePriceSigUsd,
		reserve_boarder_left_USD,
		reserve_rate,
		unconfirmed_bank_erg,
		unconfrimed_bank_reserve_rate,
		unconfrimed_bank_usd,
		unconfrimed_reserve_boarder_left_USD
	} from './stores/bank';
	import { nanoErgToErg, oracleRateToUsd } from './utils';
	import { mempool_interactions } from './stores/preparedInteractions';
	import { onMount } from 'svelte';

	onMount(() => {
		updateUnconfirmedBank();
	});

	export let confirmed = true;

	const bank = {
		type: 'UTxO',
		price: 1.77,
		reserveRatio: 551,
		amount: 1230000,
		ergAmount: 1647597
	};
</script>

<div class="row text-gray-500">
	<div class="left pb-1">
		<div>
			<div class="flex items-center gap-1 uppercase">
				{#if confirmed}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em"
						><path
							fill="currentColor"
							d="M243.4 2.6l-224 96c-14 6-21.8 21-18.7 35.8S16.8 160 32 160l0 8c0 13.3 10.7 24 24 24l400 0c13.3 0 24-10.7 24-24l0-8c15.2 0 28.3-10.7 31.3-25.6s-4.8-29.9-18.7-35.8l-224-96c-8-3.4-17.2-3.4-25.2 0zM128 224l-64 0 0 196.3c-.6 .3-1.2 .7-1.8 1.1l-48 32c-11.7 7.8-17 22.4-12.9 35.9S17.9 512 32 512l448 0c14.1 0 26.5-9.2 30.6-22.7s-1.1-28.1-12.9-35.9l-48-32c-.6-.4-1.2-.7-1.8-1.1L448 224l-64 0 0 192-40 0 0-192-64 0 0 192-48 0 0-192-64 0 0 192-40 0 0-192zM256 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
						/></svg
					>
					{bank.type} @{oracleRateToUsd($oraclePriceSigUsd)}
				{:else}
					<Spinner size={16} />
					{bank.type} @{oracleRateToUsd($oraclePriceSigUsd)}
				{/if}
			</div>
		</div>
		<span class="text-sm text-gray-500">
			{$unconfrimed_bank_reserve_rate}% Reserve
		</span>
	</div>
	<div class="flex flex-col text-gray-500">
		<div>
			<span class="mr-1 text-3xl">
				{$unconfrimed_reserve_boarder_left_USD.toLocaleString()}
			</span>
			<span class="text-lg"> SigUSD </span>
		</div>
		<div class="pr-8 text-right">
			{nanoErgToErg($unconfirmed_bank_erg, 0)}
			<span style="margin-left:7px;">ERG</span>
		</div>
	</div>
</div>

<style>
	.row {
		display: flex;
		justify-content: space-between;
		align-items: end;
		padding: 0.5rem 1rem;
	}
</style>
