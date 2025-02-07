<script lang="ts">
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

<div class="row flex flex-col gap-1 text-gray-500" style="font-variant-numeric: tabular-nums;">
	<a
		href="https://sigmaspace.io/en/address/MUbV38YgqHy7XbsoXWF5z7EZm524Ybdwe5p9WDrbhruZRtehkRPT92imXer2eTkjwPDfboa1pR3zb3deVKVq3H7Xt98qcTqLuSBSbHb7izzo5jphEpcnqyKJ2xhmpNPVvmtbdJNdvdopPrHHDBbAGGeW7XYTQwEeoRfosXzcDtiGgw97b2aqjTsNFmZk7khBEQywjYfmoDc9nUCJMZ3vbSspnYo3LarLe55mh2Np8MNJqUN9APA6XkhZCrTTDRZb1B4krgFY1sVMswg2ceqguZRvC9pqt3tUUxmSnB24N6dowfVJKhLXwHPbrkHViBv1AKAJTmEaQW2DN1fRmD9ypXxZk8GXmYtxTtrj3BiunQ4qzUCu1eGzxSREjpkFSi2ATLSSDqUwxtRz639sHM6Lav4axoJNPCHbY8pvuBKUxgnGRex8LEGM8DeEJwaJCaoy8dBw9Lz49nq5mSsXLeoC4xpTUmp47Bh7GAZtwkaNreCu74m9rcZ8Di4w1cmdsiK1NWuDh9pJ2Bv7u3EfcurHFVqCkT3P86JUbKnXeNxCypfrWsFuYNKYqmjsix82g9vWcGMmAcu5nagxD4iET86iE2tMMfZZ5vqZNvntQswJyQqv2Wc6MTh4jQx1q2qJZCQe4QdEK63meTGbZNNKMctHQbp3gRkZYNrBtxQyVtNLR8xEY8zGp85GeQKbb37vqLXxRpGiigAdMe3XZA4hhYPmAAU5hpSMYaRAjtvvMT3bNiHRACGrfjvSsEG9G2zY5in2YWz5X9zXQLGTYRsQ4uNFkYoQRCBdjNxGv6R58Xq74zCgt19TxYZ87gPWxkXpWwTaHogG1eps8WXt8QzwJ9rVx6Vu9a5GjtcGsQxHovWmYixgBU8X9fPNJ9UQhYyAWbjtRSuVBtDAmoV1gCBEPwnYVP5GCGhCocbwoYhZkZjFZy6ws4uxVLid3FxuvhWvQrVEDYp7WRvGXbNdCbcSXnbeTrPMey1WPaXX"
		target="_blank"
	>
		<div class="flex items-end justify-between">
			<div class="items-left flex flex-col">
				<div class="text-xs text-gray-600">Contract Address</div>
				<div>MUb...aXX</div>
			</div>
			<div class="items-left flex flex-col" style="margin-left:-20px">
				<div class="text-xs text-gray-600">Reserve Rate</div>
				<div>{$reserve_rate}%</div>
			</div>
			<div class="items-left flex flex-col">
				<div class="text-xs text-gray-600">Bank Reserve</div>
				<div class="items-left flex">
					<div>
						{formatAmount($bank_box_nano_erg / 10n ** 9n, false)}
					</div>
					<div class="currency">ERG</div>
				</div>
			</div>
		</div>
	</a>

	<div class="mt-2 flex items-end justify-between">
		<div class="items-left flex flex-col">
			<div class="text-xs text-gray-600">Mint Price</div>
			<span class="price-left items-left flex gap-1">
				{#if $reserve_border_left_USD > 0}
					{$bank_price_usd_sell}
				{:else}
					-.--
				{/if}</span
			>
			<span class="price-left items-left flex gap-1">
				<SubNumber value={1 / $bank_price_rsv_buy}></SubNumber></span
			>
		</div>
		<div class="items-left flex flex-col">
			<div class="text-xs text-gray-600">Redeem Price</div>
			<span class="price-left items-left flex gap-1">
				{$bank_price_usd_buy}
			</span>
			{#if $reserve_border_left_USD > 0}
				<SubNumber value={1 / $bank_price_rsv_sell}></SubNumber>
			{:else}
				-.--
			{/if}
		</div>

		<div class="items-left flex flex-col">
			<div class="text-xs text-gray-600">Mintable Assets</div>
			<div class="flex justify-end" class:text-red-500={$reserve_border_left_USD < 0}>
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
