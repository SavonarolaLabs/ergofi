<script lang="ts">
	import { onMount } from 'svelte';
	import { calculateDexyGoldNumbers, dexygold_widget_numbers } from './stores/dexyGoldStore';
	import { initJsonTestBoxes } from './stores/dexyGoldStoreJsonTestData';
	import { formatAmount } from './utils';
	import {
		bank_box_nano_erg,
		bank_price_rsv_buy,
		bank_price_rsv_sell,
		bank_price_usd_buy,
		bank_price_usd_sell,
		oracle_price_sig_usd_cent,
		reserve_border_left_USD,
		reserve_border_right_RSV,
		reserve_rate
	} from './stores/bank';
	import SubNumber from './SubNumber.svelte';
	import { DEXY_BANK_BANK, DEXY_LP_POOL_MAIN } from './dexygold/dexyAddressConstants';
	import { info } from './stores/nodeInfo';
	import { DEXY_GOLD } from './dexygold/dexyConstants';

	export let confirmed = true;

	onMount(() => {
		initJsonTestBoxes();
		calculateDexyGoldNumbers();
	});
</script>

<div
	class="row flex flex-col gap-1 rounded-md p-4 pt-3 text-gray-500"
	style="font-variant-numeric: tabular-nums; background:#f0f8ff03;"
>
	<a href="https://sigmaspace.io/en/address/{DEXY_BANK_BANK}" target="_blank">
		<div class="mb-2 font-mono text-xs font-bold text-yellow-600 hover:text-yellow-300">
			DexyGold Bank :: x6iDu8vHTP81nodtTr...nbeTrPMey1WPaXX
		</div>
	</a>

	<div class="flex items-end justify-between">
		<div class="flex">
			<a
				class="hover:text-yellow-300"
				href="https://explorer.ergoplatform.com/en/oracle-pool-state/xauerg"
				target="_blank"
			>
				<div class="items-left flex flex-col" style="width:150px">
					<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
						ERG/XAU Oracle
					</div>
					<div>{77.98} <span class="text-xs">ERG/gram</span></div>
				</div>
			</a>
		</div>
		<div class="items-left flex flex-col" style="">
			<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>LP/Oracle</div>
			<div>99%</div>
		</div>
		<div class="items-left flex flex-col">
			<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
				Total Bank Assets
			</div>
			<div class="items-left flex">
				<div>
					{formatAmount($bank_box_nano_erg / 10n ** 9n, false)}
				</div>
				<div class="currency">DexyGold</div>
			</div>
		</div>
	</div>

	<div class="mt-2 flex items-end justify-between">
		<div class="flex">
			<div class="items-left flex flex-col" style="width:131px">
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Action</div>
				<span class="items-left flex gap-1"> Freemint </span>
				<span class="items-left flex gap-1 text-gray-700"> Arbmint </span>
			</div>
			<div class="items-left flex flex-col">
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
					Blocks Cooldown
				</div>
				<span class="items-left flex gap-1">30 ≈ 15min</span>
				<span class:text-gray-700={$reserve_border_left_USD < 0}> 360 </span>
			</div>
		</div>

		<div class="items-left flex flex-col">
			<div class="pr-5 text-right text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>
				Mintable Amount
			</div>
			<div class="flex justify-end">
				<div>2k/10k</div>
				<div class="currency">DexyGold</div>
			</div>
			<div class="flex justify-end">
				<div>
					{formatAmount($reserve_border_right_RSV, false)}
				</div>
				<div class="currency">DexyGold</div>
			</div>
		</div>
	</div>
</div>

<div class="my-2"></div>

<div
	class="row flex flex-col gap-1 rounded-md p-4 pt-3 text-gray-500"
	style="font-variant-numeric: tabular-nums; background:#f0f8ff03; display:none;"
>
	<a href="https://sigmaspace.io/en/address/{DEXY_LP_POOL_MAIN}" target="_blank">
		<div class="mb-2 font-mono text-xs font-bold text-yellow-600 hover:text-yellow-300">
			DexyGold LP :: 8D6pdYVRxLrVgzcxB9...nbeTrPMey1WPaXX
		</div>
	</a>

	<div class="flex items-end justify-between">
		<div class="flex">
			<a
				class="hover:text-yellow-300"
				href="https://explorer.ergoplatform.com/en/oracle-pool-state/xauerg"
				target="_blank"
			>
				<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>ERG/XAU Rate</div>
				<div>{77.98} <span class="text-xs">ERG/gram</span></div>
			</a>
		</div>
		<div class="items-left flex flex-col" style="">
			<div class="text-xs" class:text-gray-600={$reserve_border_left_USD > 0}>Reserve Rate</div>
			<div>{$reserve_rate}%</div>
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

{$dexygold_widget_numbers}
<div class="text-sm">
	{#if $dexygold_widget_numbers && $info}
		<div>ERG/XAU Oracle: {$dexygold_widget_numbers.lpRate}</div>
		<div>
			LP/Oracle Rate: {Math.floor(
				100 *
					(Number($dexygold_widget_numbers.lpRate) / Number($dexygold_widget_numbers.oracleRate))
			)}%
		</div>
		<div>Total Bank Assets: {$dexygold_widget_numbers.bankAvailableDexy}</div>

		<div>98%</div>
		<div>101,505%</div>

		{#if $dexygold_widget_numbers.tracking101TriggerHeight + DEXY_GOLD.T_arb > $info.fullHeight}
			<div>
				PRICE ACTIVATION HEIGHT:{$dexygold_widget_numbers.tracking101TriggerHeight +
					DEXY_GOLD.T_arb -
					BigInt($info.fullHeight)}
			</div>
		{/if}

		<div>FREE NEW DEXY:{$dexygold_widget_numbers.bankFreeMintResetDexy}</div>
		<div>ARB NEW DEXY:{$dexygold_widget_numbers.bankArbMintResetDexy}</div>

		{#if $dexygold_widget_numbers.bankFreeMintResetHeight > $info.fullHeight}
			<div>
				FREE NEW DEXY LOADER BLOCKS:{$dexygold_widget_numbers.bankFreeMintResetHeight -
					BigInt($info.fullHeight)}
			</div>
		{/if}

		{#if $dexygold_widget_numbers.bankArbMintResetHeight > $info.fullHeight}
			<div>
				ARB NEW DEXY LOADER BLOCKS:{$dexygold_widget_numbers.bankArbMintResetHeight -
					BigInt($info.fullHeight)}
			</div>
		{/if}

		<div>FREE Mintable:{$dexygold_widget_numbers.bankFreeMintAvailableDexy}</div>
		<div>ARB Mintable:{$dexygold_widget_numbers.bankArbMintAvailableDexy}</div>

		<div>{$dexygold_widget_numbers.lpAvailabeDexy} lpAvailabeDexy</div>
		<div>{$dexygold_widget_numbers.lpAvailabeErg / 10n ** 9n} lpAvailabeErg</div>
		<div class="mb-1"></div>
		<div>{$dexygold_widget_numbers.bankFreeMintActivationRate} bankFreeMintActivationRate</div>
		<div>{$dexygold_widget_numbers.oracleRate} oracleRate</div>
		<div>{$dexygold_widget_numbers.bankArbMintActivationRate} bankArbMintActivationRate</div>
		<div class="mb-1"></div>
		<div>{$dexygold_widget_numbers.bankFreeMintExchangeRate} bankFreeMintExchangeRate</div>
		<div>{$dexygold_widget_numbers.bankArbMintExchangeRate} bankArbMintExchangeRate</div>
		<div>{$dexygold_widget_numbers.bankArbMintActivationHeight} bankArbMintActivationHeight</div>
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
