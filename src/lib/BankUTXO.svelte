<script lang="ts">
	import { SIGUSD_BANK_ADDRESS } from './api/ergoNode';
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
	import { formatAmount } from './utils';

	export let confirmed = true;
</script>

<div
	class="row flex flex-col gap-1 rounded-md p-4 pt-3"
	style="font-variant-numeric: tabular-nums; background:#f0f8ff03;"
>
	<a href="https://sigmaspace.io/en/address/{SIGUSD_BANK_ADDRESS}" target="_blank">
		<div
			class="mb-2 font-mono text-xs font-bold text-[var(--cl-contrast-text)] hover:text-yellow-300"
		>
			SigmaUSD Bank :: MUbV38YgqHy7XbsoX...nbeTrPMey1WPaXX
		</div>
	</a>

	<div class="flex items-end justify-between">
		<div class="flex">
			<a
				class="hover:text-yellow-300"
				href="https://explorer.ergoplatform.com/en/oracle-pool-state/ergusd"
				target="_blank"
			>
				<div class="items-left flex flex-col" style="width:150px">
					<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
						ERG/USD Oracle
					</div>
					<div>${(10 ** 7 / Number($oracle_price_sig_usd_cent)).toFixed(2)}</div>
				</div>
			</a>

			<div class="items-left flex flex-col" style="margin-left:-20px">
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Reserve Rate</div>
				<div>{$reserve_rate}%</div>
			</div>
		</div>
		<div class="items-left flex flex-col">
			<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Bank Reserve</div>
			<div class="items-left flex">
				<div>
					{formatAmount($bank_box_nano_erg / 10n ** 9n, false)}
				</div>
				<div class="currency">ERG</div>
			</div>
		</div>
	</div>

	<div class="mt-2 flex items-end justify-between">
		<div class="flex">
			<div class="items-left flex flex-col" style="width:131px">
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Mint Price</div>
				<span class="items-left flex gap-1" class:text-gray-700={$reserve_border_left_USD < 0}>
					{$bank_price_usd_sell}
				</span>
				<span class="items-left flex gap-1">
					<SubNumber value={1 / $bank_price_rsv_buy}></SubNumber></span
				>
			</div>
			<div class="items-left flex flex-col">
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Redeem Price</div>
				<span class="items-left flex gap-1">
					{$bank_price_usd_buy}
				</span>
				<span class:text-gray-700={$reserve_border_left_USD < 0}>
					<SubNumber value={1 / $bank_price_rsv_sell}></SubNumber>
				</span>
			</div>
		</div>

		<div class="items-left flex flex-col">
			<div class="pr-5 text-right text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
				Mintable Amount
			</div>
			<div class="flex justify-end" class:text-red-600={$reserve_border_left_USD < 0}>
				<div>
					{formatAmount($reserve_border_left_USD, false)}
				</div>
				<div class="currency">SigUSD</div>
			</div>
			<div class="flex justify-end">
				<div>
					{formatAmount($reserve_border_right_RSV, false)}
				</div>
				<div class="currency">SigRSV</div>
			</div>
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
