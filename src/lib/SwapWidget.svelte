<script lang="ts">
	import { RECOMMENDED_MIN_FEE_VALUE } from '@fleet-sdk/core';
	import BigNumber from 'bignumber.js';
	import {
		calculateSigUsdRateWithFee,
		calculateSigUsdRateWithFeeFromErg,
		extractBoxesData
	} from './sigmaUSD';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	// TODO: Technical Minimal Values -> 0.11
	// TODO: Swap Button -> Currency -> Direction
	// TODO: Loader Status

	onMount(async () => {
		await updateBankBoxAndOracle();
		initialInputs();
	});

	const FEE_UI = 50n; //0.5%
	const FEE_UI_DENOM = 100_00n;
	const FEE_MINING_MIN = RECOMMENDED_MIN_FEE_VALUE;
	const BASE_INPUT_AMOUNT_ERG = 100n; //100 ERG
	const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD

	// LOAD ORACLE BOX
	// Фиктивные данные (замените на реальные данные из блокчейна)
	const directionBuy = -1n;
	const directionSell = 1n;

	const bankBoxInErg = writable<bigint>(1653105734759386n);
	const bankBoxInCircSigUsd = writable<bigint>(46260638n);
	const oraclePriceSigUsd = writable<bigint>(5405405n);

	type Currency = 'ERG' | 'SigUSD';

	let fromAmount = '';
	let toAmount = '';
	let selectedCurrency: Currency = 'ERG';
	let swapPrice: number = 0.0;

	const currencies: Currency[] = ['ERG', 'SigUSD'];

	function initialInputs() {
		const { totalSigUSD, finalPrice, totalFee } = calculateInputsUsdErgFromAmount(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString())
		);
		fromAmount = BASE_INPUT_AMOUNT_ERG.toString();
		toAmount = totalSigUSD;
		swapPrice = finalPrice;
	}

	async function updateBankBoxAndOracle() {
		console.log('update start');
		const {
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			bankBox,
			oracleBox
		} = await extractBoxesData();
		bankBoxInErg.set(inErg);
		bankBoxInCircSigUsd.set(inCircSigUSD);
		oraclePriceSigUsd.set(oraclePrice);
	}

	function recalculateInputsOnCurrencyChange() {
		if (fromAmount !== '') {
			if (selectedCurrency == 'ERG') {
				const { totalSigUSD, finalPrice, totalFee } = calculateInputsUsdErgFromAmount(
					directionBuy,
					fromAmount
				);
				toAmount = totalSigUSD;
				swapPrice = finalPrice;
			} else {
				const { totalErg, finalPrice, totalFee } = calculateInputsUsdErgFromTotal(
					directionSell,
					fromAmount
				);
				toAmount = totalErg;
				swapPrice = finalPrice;
			}
		}
	}

	function handleCurrencyChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCurrency = target.value as Currency;
		recalculateInputsOnCurrencyChange();
	}

	function handleToAmountChange(event) {
		toAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			const { totalErg, finalPrice, totalFee } = calculateInputsUsdErgFromTotal(
				directionBuy,
				toAmount
			);
			fromAmount = totalErg;
			swapPrice = finalPrice;
		} else {
			const { totalSigUSD, finalPrice, totalFee } = calculateInputsUsdErgFromAmount(
				directionSell,
				toAmount
			);
			fromAmount = totalSigUSD;
			swapPrice = finalPrice;
		}
	}

	function handleFromAmountChange(event) {
		fromAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			const { totalSigUSD, finalPrice, totalFee } = calculateInputsUsdErgFromAmount(
				directionBuy,
				fromAmount
			);
			toAmount = totalSigUSD;
			swapPrice = finalPrice;
		} else {
			const { totalErg, finalPrice, totalFee } = calculateInputsUsdErgFromTotal(
				directionSell,
				fromAmount
			);
			toAmount = totalErg;
			swapPrice = finalPrice;
		}
	}

	function calculatePriceUsdErgFromAmount(direction: bigint, buyAmount: BigNumber): any {
		const inputAmountNanoERG = buyAmount
			.multipliedBy('1000000000')
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

		const miningFee = FEE_MINING_MIN;
		const amountWithoutMining = BigInt(inputAmountNanoERG) - BigInt(miningFee);
		const amountWithoutUI = new BigNumber(amountWithoutMining.toString())
			.multipliedBy(FEE_UI_DENOM.toString())
			.dividedBy((FEE_UI_DENOM + FEE_UI).toString())
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);
		const feeUI = BigInt(amountWithoutMining) - BigInt(amountWithoutUI);

		const {
			rateSCERG,
			fee: feeContract,
			requestSC
		} = calculateSigUsdRateWithFeeFromErg(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd,
			BigInt(amountWithoutUI),
			direction
		);
		const feeTotal = feeContract + miningFee + feeUI;
		const rateTotal = new BigNumber(requestSC.toString()).dividedBy(inputAmountNanoERG.toString());
		return {
			rateSCERG,
			feeContract,
			requestSC,
			feeTotal,
			rateTotal
		};
	}
	function calculateInputsUsdErgFromAmount(direction: bigint, buyAmountInput: any): any {
		const inputAmountERG = new BigNumber(buyAmountInput);
		if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
			// ------------

			const { rateSCERG, feeContract, requestSC, feeTotal, rateTotal } =
				calculatePriceUsdErgFromAmount(direction, inputAmountERG);
			const totalSigUSD = new BigNumber(requestSC.toString()).dividedBy('100').toFixed(2);
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(2);
			return { totalSigUSD, finalPrice, totalFee };
		} else {
			const { rateSCERG, feeContract, requestSC, feeTotal, rateTotal } =
				calculatePriceUsdErgFromAmount(direction, new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()));
			const totalSigUSD = '';
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = '';
			return { totalSigUSD, finalPrice, totalFee };
		}
	}

	function calculatePriceUsdErgFromTotal(direction: bigint, buyTotal: BigNumber): any {
		const totalSC = BigInt(buyTotal.toString());
		const {
			rateSCERG,
			fee: feeContract,
			bcDeltaExpectedWithFee: contractErgoRequired
		} = calculateSigUsdRateWithFee(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd,
			totalSC,
			direction
		);
		const feeUI = (contractErgoRequired * FEE_UI) / FEE_UI_DENOM;
		const miningFee = FEE_MINING_MIN;
		const feeTotal = feeContract + miningFee + feeUI;

		const totalErgoRequired = contractErgoRequired + feeUI + miningFee;
		const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());

		return { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal };
	}
	function calculateInputsUsdErgFromTotal(direction: bigint, buyTotalInput: any): any {
		const totalSigUSD = new BigNumber(buyTotalInput)
			.multipliedBy('100')
			.integerValue(BigNumber.ROUND_CEIL);

		if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
			const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
				calculatePriceUsdErgFromTotal(direction, totalSigUSD);

			const totalErg = new BigNumber(totalErgoRequired.toString())
				.dividedBy('1000000000')
				.toFixed(2);
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(2);
			return { totalErg, finalPrice, totalFee };
		} else {
			const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
				calculatePriceUsdErgFromTotal(direction, new BigNumber(BASE_INPUT_AMOUNT_USD.toString()));
			const totalErg = '';
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = '';
			return { totalErg, finalPrice, totalFee };
		}
	}

	$: toToken = selectedCurrency === 'ERG' ? 'SigUSD' : 'ERG';
	$: tokenColor = {
		ERG: 'bg-orange-500',
		SigUSD: 'bg-green-500'
	};
</script>

<div class="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow dark:bg-gray-800">
	<!-- From Input -->
	<div class="relative mb-6 rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">From</span>
			<span class="text-sm text-gray-500 dark:text-gray-400">Balance: 0.0</span>
		</div>
		<div
			style="border: none!important; outline: none!important; box-shadow: none!important;"
			class="flex items-center rounded-lg bg-gray-50 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
		>
			<input
				type="number"
				bind:value={fromAmount}
				on:input={handleFromAmountChange}
				class="w-full bg-transparent text-3xl text-gray-900 outline-none dark:text-gray-100"
				placeholder="0"
				min="0"
			/>
			<div
				style="margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px"
				class="broder relative flex w-72 items-center gap-2 rounded-lg border-gray-800 bg-white px-3 py-2 dark:bg-gray-900"
			>
				<div class="h-5 w-5 flex-shrink-0 {tokenColor[selectedCurrency]} rounded-full"></div>
				<select
					bind:value={selectedCurrency}
					on:change={handleCurrencyChange}
					class="w-full cursor-pointer bg-transparent font-medium text-gray-900 outline-none dark:text-gray-100"
				>
					{#each currencies as currency}
						<option value={currency}>{currency}</option>
					{/each}
				</select>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="pointer-events-none absolute right-3 h-6 w-6 text-gray-900 dark:text-gray-100"
				>
					<path d="M12 15.5l-6-6h12l-6 6z" />
				</svg>
			</div>
		</div>
	</div>

	<!-- To Input -->
	<div class="relative rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">To</span>
			<span class="text-sm text-gray-500 dark:text-gray-400">Price: {swapPrice}</span>
		</div>
		<div
			style="border: none!important; outline: none!important; box-shadow: none!important;"
			class="flex items-center rounded-lg bg-gray-50 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
		>
			<input
				type="number"
				bind:value={toAmount}
				on:input={handleToAmountChange}
				class="w-full bg-transparent text-3xl text-gray-900 outline-none dark:text-gray-100"
				placeholder="0"
				min="0"
			/>
			<div
				style="height:62px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px"
				class="broder relative flex w-72 items-center gap-2 rounded-lg border-gray-800 bg-white px-3 py-2 dark:bg-gray-900"
			>
				<div class="h-5 w-5 {tokenColor[toToken]} rounded-full" />
				<span class="ml-3 font-medium text-gray-800 dark:text-gray-400">{toToken}</span>
			</div>
		</div>
	</div>

	<div class="my-4 flex w-full justify-end pr-4 text-blue-500">Fee Settings</div>
	<!-- Swap Button -->
	<button
		class="w-full rounded-lg bg-orange-500 py-3 font-medium text-black text-white hover:bg-orange-600 hover:text-white dark:bg-orange-600 dark:hover:bg-orange-700"
	>
		Swap
	</button>
</div>
