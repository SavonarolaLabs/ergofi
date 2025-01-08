<script lang="ts">
	import { RECOMMENDED_MIN_FEE_VALUE, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';
	import BigNumber from 'bignumber.js';
	import {
		extractBoxesData,
		BASE_INPUT_AMOUNT_ERG,
		calculateInputsErg,
		fetchLatestOracleAndBankBox,
		calculateInputsUsd,
		buyUSDInputERG,
		sellUSDInputUSD,
		buyUSDInputUSD,
		sellUSDInputERG,
		calculateReserveRateAndBorders
	} from './sigmaUSD';
	import { onMount } from 'svelte';
	import {
		centsToUsd,
		ergStringToNanoErgBigInt,
		nanoErgToErg,
		usdStringToCentBigInt
	} from './utils';
	import {
		bank_box,
		bank_price_usd_buy,
		bank_price_usd_sell,
		bankBoxInCircSigUsd,
		bankBoxInErg,
		fee_mining,
		oracle_box,
		oraclePriceSigUsd,
		reserve_boarder_left_ERG,
		reserve_boarder_left_USD,
		reserve_boarder_right_ERG,
		reserve_boarder_right_USD,
		reserve_rate,
		type ErgoBox
	} from './stores/bank';
	import { web3wallet_confirmedTokens } from './stores/web3wallet';
	import { ERGO_TOKEN_ID, SigUSD_TOKEN_ID } from './stores/ergoTokens';

	onMount(async () => {
		await fetchLatestOracleAndBankBox();
		oracle_box.subscribe(async (oracleBox) => {
			if ($bank_box && oracleBox) {
				await updateBankBoxAndOracle(oracleBox, $bank_box);
				initialInputs($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd);
			}
		});
		bank_box.subscribe(async (bankBox) => {
			if ($oracle_box && bankBox) {
				await updateBankBoxAndOracle($oracle_box, bankBox);
				initialInputs($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd);
			}
		});
		loading = false;
		console.log(SAFE_MIN_BOX_VALUE);
		console.log(RECOMMENDED_MIN_FEE_VALUE);
		oraclePriceSigUsd.subscribe((val) => {
			window.document.title = `↑${$bank_price_usd_sell} ↓${$bank_price_usd_buy} | SigUSD`;
		});
	});

	const directionBuy = 1n;
	const directionSell = -1n;

	// TODO: type definition for OracleBox

	type Currency = 'ERG' | 'SigUSD';
	type LastUserInput = 'From' | 'To';

	let loading = true;
	let fromAmount = '';
	let toAmount = '';
	let selectedCurrency: Currency = 'ERG';
	let swapPrice: number = 0.0;
	let globalUiFeeErg;
	let globalContractERG;
	let lastInput: LastUserInput = 'From';

	const currencies: Currency[] = ['ERG', 'SigUSD'];

	//----------------------------------- Other ----------------------------------------

	function initialInputs(
		bankBoxInErg: bigint,
		bankBoxInCircSigUsd: bigint,
		oraclePriceSigUsd: bigint
	) {
		console.log('initial Inputs Start');
		const { totalSigUSD: totalSigUSDBuy, finalPrice: finalPriceBuy } = calculateInputsErg(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInErg,
			bankBoxInCircSigUsd,
			oraclePriceSigUsd
		);
		const { totalSigUSD: totalSigUSDSell, finalPrice: finalPriceSell } = calculateInputsErg(
			directionSell,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInErg,
			bankBoxInCircSigUsd,
			oraclePriceSigUsd
		);
		bank_price_usd_buy.set(finalPriceBuy);
		bank_price_usd_sell.set(finalPriceSell);

		fromAmount = BASE_INPUT_AMOUNT_ERG.toString();
		toAmount = totalSigUSDBuy;
		swapPrice = finalPriceBuy;
	}

	async function updateBankBoxAndOracle(oracleBox: ErgoBox, bankBox: ErgoBox) {
		console.log('update start', oracleBox, bankBox);
		const {
			inErg,

			inCircSigUSD,
			oraclePrice
		} = await extractBoxesData(oracleBox, bankBox);
		bankBoxInErg.set(inErg);
		bankBoxInCircSigUsd.set(inCircSigUSD);
		oraclePriceSigUsd.set(oraclePrice);

		const { reserveRate, leftUSD, rightUSD, leftERG, rightERG } = calculateReserveRateAndBorders(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd
		);
		reserve_rate.set(reserveRate);
		reserve_boarder_left_USD.set(leftUSD);
		reserve_boarder_left_ERG.set(leftERG);
		reserve_boarder_right_USD.set(rightUSD);
		reserve_boarder_right_ERG.set(rightERG);
	}

	function recalculateInputsOnCurrencyChange(
		bankBoxInErg: bigint,
		bankBoxInCircSigUsd: bigint,
		oraclePriceSigUsd: bigint
	) {
		// TODO: Recalculate based on lastInput
		if (fromAmount !== '') {
			if (selectedCurrency == 'ERG') {
				const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } = calculateInputsErg(
					directionBuy,
					fromAmount,
					bankBoxInErg,
					bankBoxInCircSigUsd,
					oraclePriceSigUsd
				);
				toAmount = totalSigUSD;
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
				swapPrice = finalPrice;
			} else {
				const { totalErg, finalPrice, totalFee } = calculateInputsUsd(directionSell, fromAmount);
				toAmount = totalErg;
				swapPrice = finalPrice;
			}
		}
	}

	//----------------------------------- Handlers ----------------------------------------

	async function handleSwapButton(event: Event) {
		// TODO: change based on lastInput
		if (lastInput == 'From') {
			if (selectedCurrency == 'ERG') {
				//CANT SIGN
				console.log('f1');
				const nanoErg = ergStringToNanoErgBigInt(fromAmount);
				await buyUSDInputERG(nanoErg);
			} else {
				console.log('f3');
				const cents = usdStringToCentBigInt(fromAmount);
				await sellUSDInputUSD(cents);
			}
		} else {
			if (selectedCurrency == 'ERG') {
				console.log('f2');
				const cents = usdStringToCentBigInt(toAmount);
				await buyUSDInputUSD(cents);
			} else {
				//CANT SIGN
				console.log('f4');
				const nanoErg = ergStringToNanoErgBigInt(toAmount);
				await sellUSDInputERG(nanoErg);
			}
		}
	}

	function handleCurrencyChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCurrency = target.value as Currency;
		recalculateInputsOnCurrencyChange($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd);
	}

	function handleFromAmountChange(event: Event) {
		fromAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			// (f1.price)
			const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } = calculateInputsErg(
				directionBuy,
				fromAmount,
				$bankBoxInErg,
				$bankBoxInCircSigUsd,
				$oraclePriceSigUsd
			);
			toAmount = totalSigUSD;
			globalUiFeeErg = uiFeeErg;
			globalContractERG = contractERG;
			swapPrice = finalPrice;
		} else {
			// (f3.price)
			const { totalErg, finalPrice, totalFee } = calculateInputsUsd(directionSell, fromAmount);
			toAmount = totalErg;
			swapPrice = finalPrice;
		}
		lastInput = 'From';
	}

	function handleToAmountChange(event: Event) {
		toAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			// (f2.price)
			const { totalErg, finalPrice, totalFee } = calculateInputsUsd(directionBuy, toAmount);
			fromAmount = totalErg;
			swapPrice = finalPrice;
		} else {
			// (f4.price)
			const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } = calculateInputsErg(
				directionSell,
				toAmount,
				$bankBoxInErg,
				$bankBoxInCircSigUsd,
				$oraclePriceSigUsd
			);
			fromAmount = totalSigUSD;
			globalUiFeeErg = uiFeeErg;
			globalContractERG = contractERG;
			swapPrice = finalPrice;
		}
		lastInput = 'To';
	}

	function handleFeeChange(event: Event) {
		fee_mining.set(BigInt(Number(event.target.value) * 10 ** 9));
		recalculateInputsOnCurrencyChange($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd); //TODO: To Amount Hadle
	}

	//----------------------------------- PRICE/SWAP ----------------------------------------

	$: toToken = selectedCurrency === 'ERG' ? 'SigUSD' : 'ERG';
	$: tokenColor = {
		ERG: 'bg-orange-500',
		SigUSD: 'bg-green-500'
	};

	let minerFee = 0.01;
	let showFeeSlider = false;
	const toggleFeeSlider = () => {
		showFeeSlider = !showFeeSlider;
	};
</script>

<div class="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow dark:bg-gray-800">
	<!-- From Input -->
	<div class="relative mb-6 rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">From</span>
			<span class="text-sm text-gray-500 dark:text-gray-400"
				>Balance: {#if selectedCurrency == 'ERG'}
					{nanoErgToErg(
						$web3wallet_confirmedTokens.find((x) => x.tokenId == ERGO_TOKEN_ID)?.amount
					)}
				{:else}
					{centsToUsd(
						$web3wallet_confirmedTokens.find((x) => x.tokenId == SigUSD_TOKEN_ID)?.amount
					)}
				{/if}</span
			>
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
				class="dark:broder relative flex w-72 items-center gap-2 rounded-lg bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
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
			<span class="text-sm text-gray-500 dark:text-gray-400">Real Rate: {swapPrice}</span>
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
				class="broder relative flex w-72 items-center gap-2 rounded-lg bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
			>
				<div class="h-5 w-5 {tokenColor[toToken]} rounded-full" />
				<span class="ml-3 font-medium text-gray-800 dark:text-gray-400">{toToken}</span>
			</div>
		</div>
	</div>

	<!-- Fee Settings -->
	<div class="flex w-full justify-end">
		<button class="my-4 flex cursor-pointer pr-4 text-blue-500" on:click={toggleFeeSlider}>
			{#if showFeeSlider}
				Hide Fee Settings
			{:else}
				Fee Settings
			{/if}
		</button>
	</div>
	<div
		class={`overflow-hidden transition-all duration-300 ${showFeeSlider ? 'max-h-24 py-4' : 'max-h-0'}`}
	>
		<input
			type="range"
			min="0.01"
			max="1"
			step="0.01"
			bind:value={minerFee}
			on:change={handleFeeChange}
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 dark:bg-gray-700"
		/>
		<div class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
			Miner Fee: {minerFee.toFixed(2)} ERG
		</div>
	</div>

	<!-- Swap Button -->
	<button
		on:click={handleSwapButton}
		class="w-full rounded-lg bg-orange-500 py-3 font-medium text-black text-white hover:bg-orange-600 hover:text-white dark:bg-orange-600 dark:hover:bg-orange-700"
	>
		Swap
	</button>
</div>
