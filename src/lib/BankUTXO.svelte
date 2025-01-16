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

	<div class="flex items-end justify-between text-xl">
		<div class="flex items-center gap-1 text-lg uppercase">
			<span class="price-left">↑ {$bank_price_usd_sell}</span> ↓ {$bank_price_usd_buy}
		</div>
		<div class="flex items-center">
			<div>
				{$reserve_border_left_USD.toLocaleString()}
			</div>
			<div class="currency text-lg">SigUSD</div>
		</div>
	</div>
	<div class="flex items-end justify-between text-xl">
		<div class="flex items-center gap-1 text-lg uppercase">
			<span class="price-left">↑ <SubNumber value={1 / $bank_price_rsv_buy}></SubNumber></span>
			↓ <SubNumber value={1 / $bank_price_rsv_sell}></SubNumber>
		</div>
		<div class="flex items-center">
			<div>
				{formatAmount($reserve_border_right_RSV)}
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
