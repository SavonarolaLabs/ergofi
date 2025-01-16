<script lang="ts">
	import Bank from './icons/Bank.svelte';
	import Spinner from './Spinner.svelte';
	import {
		bank_price_rsv_buy,
		bank_price_rsv_sell,
		bank_price_usd_buy,
		bank_price_usd_sell,
		bankBoxInNanoErg,
		oraclePriceSigUsd,
		reserve_border_left_USD,
		reserve_border_right_RSV,
		reserve_rate
	} from './stores/bank';
	import SubNumber from './SubNumber.svelte';
	import { formatAmount, nanoErgToErg, oracleRateToUsd } from './utils';

	export let confirmed = true;

	const bank = {
		type: 'UTxO',
		price: 1.77,
		reserveRatio: 551,
		amount: 1230000,
		ergAmount: 1647597
	};
</script>

<div class="row flex flex-col gap-1 text-gray-500">
	<div class="text-md flex items-end justify-between">
		<div class="flex items-center gap-2 text-gray-500">
			<Bank></Bank>
			<div>{$reserve_rate}% Reserve</div>
		</div>
		<div class="flex items-center">
			<div>
				{nanoErgToErg($bankBoxInNanoErg, 0)}
			</div>
			<div class="currency">ERG</div>
		</div>
	</div>

	<div class="flex items-end justify-between text-lg">
		<div class="flex items-center gap-1 text-lg uppercase">
			<span class="price-left flex items-center gap-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 320 512"
					width="0.6em"
					fill="currentColor"
					><path
						d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"
					/></svg
				>
				{$bank_price_usd_sell}</span
			>

			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 320 512"
				width="0.6em"
				fill="currentColor"
				><path
					d="M182.6 137.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8l256 0c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-128-128z"
				/></svg
			>
			{$bank_price_usd_buy}
		</div>
		<div class="flex items-center font-normal">
			<div>
				{$reserve_border_left_USD.toLocaleString()}
			</div>
			<div class="currency text-lg">SigUSD</div>
		</div>
	</div>
	<div class="flex items-end justify-between text-lg">
		<div class="flex items-center gap-1 uppercase">
			<span class="price-left flex items-center gap-1"
				><svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 320 512"
					width="0.6em"
					fill="currentColor"
					><path
						d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"
					/></svg
				>
				<SubNumber value={1 / $bank_price_rsv_buy}></SubNumber></span
			>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 320 512"
				width="0.6em"
				fill="currentColor"
				><path
					d="M182.6 137.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8l256 0c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-128-128z"
				/></svg
			>
			<SubNumber value={1 / $bank_price_rsv_sell}></SubNumber>
		</div>
		<div class="flex items-center font-normal">
			<div>
				{formatAmount($reserve_border_right_RSV, false)}
			</div>
			<div class="currency text-lg">SigRSV</div>
		</div>
	</div>
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
