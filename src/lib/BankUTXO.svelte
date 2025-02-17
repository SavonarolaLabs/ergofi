<script lang="ts">
	import { SIGUSD_BANK_ADDRESS } from './api/ergoNode';
	import { sigmausd_numbers } from './stores/bank';
	import SubNumber from './SubNumber.svelte';
	import { formatAmount } from './utils';

	export let confirmed = true;
</script>

<div
	class="row flex flex-col gap-1 rounded-md p-4 pt-3"
	style="font-variant-numeric: tabular-nums; background:#f0f8ff03;"
>
	<a
		href="https://sigmaspace.io/en/address/{SIGUSD_BANK_ADDRESS}"
		class="text-[var(--cl-contrast-text)]"
		target="_blank"
	>
		<div class="mb-2 font-mono text-xs font-bold">
			SigmaUSD Bank :: MUbV38YgqHy7XbsoX...nbeTrPMey1WPaXX
		</div>
	</a>

	<div class="flex items-end justify-between">
		<div class="flex">
			<a
				class=""
				href="https://explorer.ergoplatform.com/en/oracle-pool-state/ergusd"
				target="_blank"
			>
				<div class="items-left flex flex-col" style="width:150px">
					<div class="text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>ERG/USD Oracle</div>
					<div>${(10 ** 7 / Number($sigmausd_numbers.oraclePrice)).toFixed(2)}</div>
				</div>
			</a>

			<div class="items-left flex flex-col" style="margin-left:-20px">
				<div class="text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>Reserve Rate</div>
				<div>{$sigmausd_numbers.reserveRate}%</div>
			</div>
		</div>
		<div class="items-left flex flex-col">
			<div class="text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>Bank Reserve</div>
			<div class="items-left flex">
				<div>
					{formatAmount($sigmausd_numbers.inErg / 10n ** 9n, false)}
				</div>
				<div class="currency">ERG</div>
			</div>
		</div>
	</div>

	<div class="mt-2 flex items-end justify-between">
		<div class="flex">
			<div class="items-left flex flex-col" style="width:131px">
				<div class="text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>Mint Price</div>
				<span class="items-left flex gap-1" class:text-muted={$sigmausd_numbers.leftUSD < 0}>
					{$sigmausd_numbers.bankPriceUsdSell}
				</span>
				<span class="items-left flex gap-1">
					<SubNumber value={1 / $sigmausd_numbers.bankPriceRsvBuy}></SubNumber></span
				>
			</div>
			<div class="items-left flex flex-col">
				<div class="text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>Redeem Price</div>
				<span class="items-left flex gap-1">
					{$sigmausd_numbers.bankPriceUsdBuy}
				</span>
				<span class:text-muted={$sigmausd_numbers.leftUSD < 0}>
					<SubNumber value={1 / $sigmausd_numbers.bankPriceRsvSell}></SubNumber>
				</span>
			</div>
		</div>

		<div class="items-left flex flex-col">
			<div class="pr-5 text-right text-xs" class:text-muted={$sigmausd_numbers.leftUSD > 0}>
				Mintable Amount
			</div>
			<div class="flex justify-end" class:text-red-600={$sigmausd_numbers.leftUSD < 0}>
				<div>
					{formatAmount($sigmausd_numbers.leftUSD, false)}
				</div>
				<div class="currency">SigUSD</div>
			</div>
			<div class="flex justify-end">
				<div>
					{formatAmount($sigmausd_numbers.rightRSV, false)}
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
