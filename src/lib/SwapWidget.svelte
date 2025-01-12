<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	import BigNumber from 'bignumber.js';
	import {
		extractBoxesData,
		BASE_INPUT_AMOUNT_ERG,
		calculateInputsErg,
		calculateInputsUsd,
		buyUSDInputERG,
		sellUSDInputUSD,
		buyUSDInputUSD,
		sellUSDInputERG,
		calculateReserveRateAndBorders,
		buyRSVInputRSV,
		sellRSVInputRSV
	} from './sigmaUSD';

	import {
		centsToUsd,
		ergStringToNanoErgBigInt,
		isOwnTx,
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
	import {
		web3wallet_confirmedTokens,
		web3wallet_wallet_change_address
	} from './stores/web3wallet';
	import { ERGO_TOKEN_ID, SigUSD_TOKEN_ID, SigRSV_TOKEN_ID } from './stores/ergoTokens';
	import { confirmed_interactions } from './stores/preparedInteractions';

	type Currency = 'ERG' | 'SigUSD' | 'SigRSV';
	type LastUserInput = 'From' | 'To';

	// For swapping, use these constants
	const directionBuy = 1n;
	const directionSell = -1n;

	/* ---------------------------------------
	 * Local variables
	 * ------------------------------------- */
	let fromCurrency: Currency = 'ERG'; // default to ERG
	let toCurrency: Currency = 'SigUSD'; // default to SigUSD (when from=ERG)
	let fromAmount = '';
	let toAmount = '';
	let swapPrice: number = 0.0;
	let globalUiFeeErg;
	let globalContractERG;
	let lastInput: LastUserInput = 'From';

	let minerFee = 0.01;
	let showFeeSlider = false;

	// Full set of possible 'from' currencies
	const fromCurrencies: Currency[] = ['ERG', 'SigUSD', 'SigRSV'];

	// Utility: Allowed "to" currencies depends on "fromCurrency"
	function getAllowedToCurrencies(fromC: Currency): Currency[] {
		if (fromC === 'ERG') {
			return ['SigUSD', 'SigRSV']; // can pick either
		} else {
			return ['ERG']; // forced
		}
	}

	//  Colors for the circles
	function tokenColor(c: Currency) {
		return {
			ERG: 'bg-orange-500',
			SigUSD: 'bg-green-500',
			SigRSV: 'bg-yellow-300'
		}[c];
	}

	/* ---------------------------------------
	 * onMount: load / subscribe / etc.
	 * ------------------------------------- */
	onMount(() => {
		oracle_box.subscribe((oracleBox) => {
			if ($bank_box && oracleBox) {
				updateBankBoxAndOracle(oracleBox, $bank_box);
				initialInputs($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd);
			}
		});

		bank_box.subscribe((bankBox) => {
			if ($oracle_box && bankBox) {
				updateBankBoxAndOracle($oracle_box, bankBox);
				initialInputs($bankBoxInErg, $bankBoxInCircSigUsd, $oraclePriceSigUsd);
			}
		});

		bank_price_usd_sell.subscribe((val) => {
			window.document.title = `↑${val} ↓${$bank_price_usd_buy} | SigUSD`;
		});
		bank_price_usd_buy.subscribe((val) => {
			window.document.title = `↑${$bank_price_usd_sell} ↓${val} | SigUSD`;
		});

		web3wallet_wallet_change_address.subscribe((addr) => {
			if (addr) {
				confirmed_interactions.update((list) =>
					list.map((i) => {
						i.own = isOwnTx(i.tx, [addr]);
						return i;
					})
				);
			}
		});
	});

	/* ---------------------------------------
	 * BankBox + Oracle helper
	 * ------------------------------------- */
	async function updateBankBoxAndOracle(oracleBox: ErgoBox, bankBox: ErgoBox) {
		const { inErg, inCircSigUSD, oraclePrice } = extractBoxesData(oracleBox, bankBox);
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

	function initialInputs(
		bankBoxInErg: bigint,
		bankBoxInCircSigUsd: bigint,
		oraclePriceSigUsd: bigint
	) {
		// Just as before, let's get a "baseline" buy/sell price from 0.1 ERG
		const { totalSigUSD: totalSigUSDBuy, finalPrice: finalPriceBuy } = calculateInputsErg(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInErg,
			bankBoxInCircSigUsd,
			oraclePriceSigUsd
		);

		bank_price_usd_buy.set(finalPriceBuy);

		// We'll just set some starting example
		fromAmount = BASE_INPUT_AMOUNT_ERG.toString(); // e.g. "0.1"
		toAmount = totalSigUSDBuy; // e.g. "10"
		swapPrice = finalPriceBuy; // e.g. real rate
	}

	/* ---------------------------------------
	 * Recalculation logic
	 * ------------------------------------- */
	/**
	 * doRecalc() updates `toAmount` (or `fromAmount`) + swapPrice
	 * depending on which field was last changed.
	 */
	function doRecalc() {
		// If either side is empty, just zero out the other side
		if (!fromAmount && !toAmount) {
			swapPrice = 0;
			return;
		}

		// Distinguish direction:
		//   - If lastInput === 'From', the user typed in fromAmount => compute toAmount
		//   - If lastInput === 'To',   the user typed in toAmount   => compute fromAmount
		if (lastInput === 'From') {
			if (fromCurrency === 'ERG' && toCurrency === 'SigUSD') {
				// ERG -> SigUSD (buy SigUSD with ERG)
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsErg(
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
			} else if (fromCurrency === 'ERG' && toCurrency === 'SigRSV') {
				// ERG -> SigRSV (placeholder, treat like ERG->SigUSD)
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsErg(
					directionBuy,
					fromAmount,
					$bankBoxInErg,
					$bankBoxInCircSigUsd,
					$oraclePriceSigUsd
				);
				toAmount = totalSigUSD; // rename to, e.g., totalSigRSV if you have a separate function
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
				swapPrice = finalPrice;
			} else if (fromCurrency === 'SigUSD' && toCurrency === 'ERG') {
				// SigUSD -> ERG
				const { totalErg, finalPrice } = calculateInputsUsd(directionSell, fromAmount);
				toAmount = totalErg;
				swapPrice = finalPrice;
			} else {
				// fromCurrency === 'SigRSV' -> 'ERG'
				// Placeholder: treat like SigUSD->ERG
				const { totalErg, finalPrice } = calculateInputsUsd(directionSell, fromAmount);
				toAmount = totalErg;
				swapPrice = finalPrice;
			}
		} else {
			// lastInput === 'To' => user typed in `toAmount`
			if (fromCurrency === 'ERG' && toCurrency === 'SigUSD') {
				// user typed in "SigUSD" => figure out how many ERG
				const { totalErg, finalPrice } = calculateInputsUsd(directionBuy, toAmount);
				fromAmount = totalErg;
				swapPrice = finalPrice;
			} else if (fromCurrency === 'ERG' && toCurrency === 'SigRSV') {
				// user typed in "SigRSV" => figure out how many ERG (placeholder)
				const { totalErg, finalPrice } = calculateInputsUsd(directionBuy, toAmount);
				fromAmount = totalErg;
				swapPrice = finalPrice;
			} else if (fromCurrency === 'SigUSD' && toCurrency === 'ERG') {
				// user typed in "ERG" => figure out how many SigUSD
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsErg(
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
			} else {
				// fromCurrency === 'SigRSV' && toCurrency === 'ERG'
				// user typed in "ERG" => figure out how many SigRSV
				// placeholder: treat it like SigUSD
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsErg(
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
		}
	}

	/* ---------------------------------------
	 * Handlers
	 * ------------------------------------- */
	function handleFromCurrencyChange(event: Event) {
		const newVal = (event.target as HTMLSelectElement).value as Currency;
		fromCurrency = newVal;

		// If we switched fromCurrency to something else,
		// check if we need to force toCurrency = ERG
		const allowed = getAllowedToCurrencies(fromCurrency);
		if (!allowed.includes(toCurrency)) {
			toCurrency = allowed[0]; // pick first from allowed
		}

		// Recalc with updated from/to selection
		doRecalc();
	}

	function handleToCurrencyChange(event: Event) {
		// Only matters if fromCurrency === 'ERG'
		const newVal = (event.target as HTMLSelectElement).value as Currency;
		toCurrency = newVal;
		doRecalc();
	}

	function handleFromAmountChange(event: Event) {
		fromAmount = (event.target as HTMLInputElement).value;
		lastInput = 'From';
		doRecalc();
	}

	function handleToAmountChange(event: Event) {
		toAmount = (event.target as HTMLInputElement).value;
		lastInput = 'To';
		doRecalc();
	}

	async function handleSwapButton() {
		// For demonstration, handle all 4 possible combos
		if (lastInput === 'From') {
			// user typed in fromAmount
			if (fromCurrency === 'ERG' && toCurrency === 'SigUSD') {
				const nanoErg = ergStringToNanoErgBigInt(fromAmount);
				await buyUSDInputERG(nanoErg);
			} else if (fromCurrency === 'ERG' && toCurrency === 'SigRSV') {
				// placeholder: call your own function for ERG -> RSV
				const nanoErg = ergStringToNanoErgBigInt(fromAmount);
				console.log('Swapping ERG->SigRSV with', nanoErg.toString(), 'nanoERGs');
			} else if (fromCurrency === 'SigUSD') {
				const cents = usdStringToCentBigInt(fromAmount);
				await sellUSDInputUSD(cents);
			} else {
				// fromCurrency=SigRSV
				const rsv = BigInt(fromAmount);
				// placeholder: sellRSVInputRSV(cents)
				//console.log('SigRSV->ERG (from typed) not fully implemented. Value:', rsv.toString());
				console.log('f7');
				await sellRSVInputRSV(rsv);
			}
		} else {
			// lastInput === 'To'
			// user typed in toAmount
			if (fromCurrency === 'ERG' && toCurrency === 'SigUSD') {
				const cents = usdStringToCentBigInt(toAmount);
				await buyUSDInputUSD(cents);
			} else if (fromCurrency === 'ERG' && toCurrency === 'SigRSV') {
				// placeholder
				const rsv = BigInt(toAmount);
				// console.log('ERG->SigRSV (to typed) not fully implemented. Value:', rsv.toString());
				console.log('f6');
				await buyRSVInputRSV(rsv);
			} else if (fromCurrency === 'SigUSD') {
				const nanoErg = ergStringToNanoErgBigInt(toAmount);
				await sellUSDInputERG(nanoErg);
			} else {
				// fromCurrency=SigRSV
				const nanoErg = ergStringToNanoErgBigInt(toAmount);
				console.log('SigRSV->ERG (to typed) not fully implemented. Value:', nanoErg.toString());
			}
		}
	}

	function handleFeeChange(event: Event) {
		fee_mining.set(BigInt(Number((event.target as HTMLInputElement).value) * 10 ** 9));
		doRecalc();
	}

	const toggleFeeSlider = () => {
		showFeeSlider = !showFeeSlider;
	};

	/* ---------------------------------------
	 *  Reactive / Derived
	 * ------------------------------------- */
	// Display the user's balance for the "fromCurrency"
	$: fromBalance = (() => {
		if (fromCurrency === 'ERG') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === ERGO_TOKEN_ID)?.amount || 0n;
			return nanoErgToErg(amt);
		} else if (fromCurrency === 'SigUSD') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigUSD_TOKEN_ID)?.amount || 0n;
			return centsToUsd(amt);
		} else {
			// SigRSV
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigRSV_TOKEN_ID)?.amount || 0n;
			return centsToUsd(amt); // if SigRSV uses different decimals, update accordingly
		}
	})();
</script>

<div class="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow dark:bg-gray-800">
	<!-- FROM SELECTION -->
	<div class="mb-6 rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">From</span>
			<span class="text-sm text-gray-500 dark:text-gray-400">
				Balance: {fromBalance}
			</span>
		</div>

		<div
			class="flex items-center rounded-lg bg-gray-50 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
			style="border: none!important; outline: none!important; box-shadow: none!important;"
		>
			<!-- FROM AMOUNT -->
			<input
				type="number"
				class="w-full bg-transparent text-3xl text-gray-900 outline-none dark:text-gray-100"
				placeholder="0"
				min="0"
				bind:value={fromAmount}
				on:input={handleFromAmountChange}
			/>

			<!-- FROM CURRENCY SELECT -->
			<div
				class="relative flex w-72 items-center gap-2 rounded-lg bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
				style="margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px"
			>
				<div class="h-5 w-5 flex-shrink-0 {tokenColor(fromCurrency)} rounded-full"></div>
				<select
					class="w-full cursor-pointer bg-transparent font-medium text-gray-900 outline-none dark:text-gray-100"
					style="max-width:113px;"
					bind:value={fromCurrency}
					on:change={handleFromCurrencyChange}
				>
					{#each fromCurrencies as c}
						<option value={c}>{c}</option>
					{/each}
				</select>

				<svg
					class="pointer-events-none absolute right-3 h-6 w-6 text-gray-900 dark:text-gray-100"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M12 15.5l-6-6h12l-6 6z" />
				</svg>
			</div>
		</div>
	</div>

	<!-- TO SELECTION -->
	<div class="rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">To</span>
			<span class="text-sm text-gray-500 dark:text-gray-400">Real Rate: {swapPrice}</span>
		</div>

		<div
			class="flex items-center rounded-lg bg-gray-50 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
			style="border: none!important; outline: none!important; box-shadow: none!important;"
		>
			<!-- TO AMOUNT -->
			<input
				type="number"
				class="w-full bg-transparent text-3xl text-gray-900 outline-none dark:text-gray-100"
				placeholder="0"
				min="0"
				bind:value={toAmount}
				on:input={handleToAmountChange}
			/>

			<!-- TO CURRENCY SELECT OR FIXED -->
			<div
				class="relative flex w-72 items-center gap-2 rounded-lg bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
				style="height:62px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px"
			>
				<!-- If from=ERG, user can pick. Otherwise, we show a fixed label. -->
				{#if fromCurrency === 'ERG'}
					<!-- Enabled SELECT for SigUSD/SigRSV -->
					<div class="h-5 w-5 {tokenColor(toCurrency)} rounded-full"></div>
					<select
						class="w-full cursor-pointer bg-transparent font-medium text-gray-900 outline-none dark:text-gray-100"
						style="max-width:113px;"
						bind:value={toCurrency}
						on:change={handleToCurrencyChange}
					>
						{#each getAllowedToCurrencies('ERG') as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				{:else}
					<!-- Forced to 'ERG' -->
					<div class="h-5 w-5 {tokenColor('ERG')} rounded-full"></div>
					<span class="ml-3 font-medium text-gray-800 dark:text-gray-400">ERG</span>
				{/if}

				{#if fromCurrency === 'ERG'}
					<svg
						class="pointer-events-none absolute right-3 h-6 w-6 text-gray-900 dark:text-gray-100"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M12 15.5l-6-6h12l-6 6z" />
					</svg>
				{/if}
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
		class={`overflow-hidden transition-all duration-300 ${
			showFeeSlider ? 'max-h-24 py-4' : 'max-h-0'
		}`}
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
		class="w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 hover:text-white dark:bg-orange-600 dark:hover:bg-orange-700"
	>
		Swap
	</button>
</div>
