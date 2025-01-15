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
	import { nanoErgToErg, oracleRateToUsd } from './utils';

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
	<div class="flex items-end justify-between">
		<div class="flex items-center gap-2 text-gray-500">
			<Bank></Bank>
			{$reserve_rate}% Reserve
		</div>
		<div class="flex items-center">
			<span class="text-lg">
				{nanoErgToErg($bankBoxInNanoErg, 0)}
			</span><span class="currency" style="width:57px">ERG</span>
		</div>
	</div>

	<div class="flex items-end justify-between">
		<div class="flex items-center gap-1 uppercase">
			<span class="price-left pl-1">↑ {$bank_price_usd_sell}</span> ↓ {$bank_price_usd_buy}
		</div>
		<div>
			<span class="text-lg">
				{$reserve_border_left_USD.toLocaleString()}
			</span><span class="currency">SigUSD</span>
		</div>
	</div>
	<div class="flex items-end justify-between">
		<div class=" flex items-center gap-1 uppercase">
			<span class="price-left pl-1">↑ <SubNumber value={1 / $bank_price_rsv_sell}></SubNumber></span
			>
			↓ <SubNumber value={1 / $bank_price_rsv_buy}></SubNumber>
		</div>
		<div>
			<span class="text-lg">
				<!-- {$reserve_border_right_RSV.toLocaleString()} -->--
			</span><span class="currency">SigRSV</span>
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
		width: 90px;
	}
</style>
