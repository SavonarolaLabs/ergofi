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

<div class="row text-lg text-gray-500">
	<div class="left pb-1">
		<span class="flex items-center gap-2 text-sm text-gray-500">
			<Bank></Bank>
			{$reserve_rate}% Reserve
		</span>
		<div>
			<div class="flex items-center gap-1 uppercase">
				↑{$bank_price_usd_sell} ↓{$bank_price_usd_buy}
			</div>
		</div>
		<div>
			<div class="flex items-center gap-1 uppercase">
				↑<SubNumber value={1 / $bank_price_rsv_sell}></SubNumber> ↓<SubNumber
					value={1 / $bank_price_rsv_buy}
				></SubNumber>
			</div>
		</div>
	</div>
	<div class="flex flex-col text-gray-500">
		<div class="pr-8 text-right">
			{nanoErgToErg($bankBoxInNanoErg, 0)}
			<span style="margin-left:7px;">ERG</span>
		</div>
		<div>
			<span class="mr-1">
				{$reserve_border_left_USD.toLocaleString()}
			</span>
			<span class=""> SigUSD </span>
		</div>
		<div>
			<span class="mr-1">
				{$reserve_border_right_RSV.toLocaleString()}
			</span>
			<span class=""> SigRSV </span>
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
