<script lang="ts">
	import { onMount } from 'svelte';

	import BigNumber from 'bignumber.js';
	import {
		calculateInputsUsdErgInErg,
		BASE_INPUT_AMOUNT_ERG,
		calculateInputsUsdErgInUsd,
		buyUSDInputERG,
		sellUSDInputUSD,
		buyUSDInputUSD,
		sellUSDInputERG,
		calculateReserveRateAndBorders,
		buyRSVInputRSV,
		sellRSVInputRSV,
		buyRSVInputERG,
		sellRSVInputERG,
		extractBoxesData,
		calculateInputsRSVErgInErg,
		calculateInputsRSVErgInRSV
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
		bank_price_rsv_buy,
		bank_price_rsv_sell,
		bank_price_usd_buy,
		bank_price_usd_sell,
		bankBoxInCircSigRsv,
		bankBoxInCircSigUsdInCent,
		bankBoxInNanoErg,
		fee_mining,
		oracle_box,
		oraclePriceSigUsd,
		reserve_border_left_ERG,
		reserve_border_left_RSV,
		reserve_border_left_USD,
		reserve_border_right_ERG,
		reserve_border_right_RSV,
		reserve_border_right_USD,
		reserve_rate,
		type ErgoBox
	} from './stores/bank';
	import {
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_wallet_used_addresses
	} from './stores/web3wallet';
	import { ERGO_TOKEN_ID, SigUSD_TOKEN_ID, SigRSV_TOKEN_ID } from './stores/ergoTokens';
	import { confirmed_interactions, mempool_interactions } from './stores/preparedInteractions';
	import SubNumber from './SubNumber.svelte';
	import { ArrowDown, ArrowUpDown, Cog } from 'lucide-svelte';
	import WalletBalance from './icons/WalletBalance.svelte';
	import { getWalletInstallLink } from './installWallet';
	import Gear from './icons/Gear.svelte';

	/* ---------------------------------------
	 * Types & Constants
	 * ------------------------------------- */
	type Currency = {
		tokens: string[]; // e.g. ["ERG"], ["SigUSD"], ["SigRSV"]
		isLpToken?: boolean;
		isLpPool?: boolean;
	};

	type LastUserInput = 'From' | 'To';

	// We define some helpers for clarity:
	const currencyERG: Currency = { tokens: ['ERG'] };
	const currencySigUSD: Currency = { tokens: ['SigUSD'] };
	const currencySigRSV: Currency = { tokens: ['SigRSV'] };
	const currencyDexyGold: Currency = { tokens: ['DexyGold'] };
	const currencyErgDexyGoldLpToken: Currency = { tokens: ['ERG', 'DexyGold'], isLpToken: true };
	const currencyErgDexyGoldLpPool: Currency = { tokens: ['ERG', 'DexyGold'], isLpPool: true };

	// All possible "from" currencies
	const fromCurrencies: Currency[] = [
		currencyERG,
		currencySigUSD,
		currencySigRSV,
		currencyDexyGold,
		// currencyErgDexyGoldLpToken,
		currencyErgDexyGoldLpPool
	];

	// For swapping, use these constants
	const directionBuy = 1n;
	const directionSell = -1n;

	/* ---------------------------------------
	 * Local variables
	 * ------------------------------------- */
	let fromCurrency: Currency = currencyErgDexyGoldLpPool; // default to ERG: { tokens: ['ERG'] }
	let toCurrency: Currency = currencySigRSV; // default to SigRSV: { tokens: ['SigRSV'] }
	let fromAmount = '';
	let fromAmount2 = '';
	let toAmount = '';
	let swapPrice: number = 0.0;
	let globalUiFeeErg;
	let globalContractERG;
	let lastInput: LastUserInput = 'From';

	let minerFee = 0.01;
	let showFeeSlider = false;

	let fromDropdownOpen = false;
	let toDropdownOpen = false;
	let currencySwapHovered = false;

	// Utility: Allowed "to" currencies depends on "fromCurrency"
	function getAllowedToCurrencies(fromC: Currency): Currency[] {
		if (fromC.tokens[0] === 'ERG') {
			// If from == ERG, user can pick SigUSD or SigRSV
			return [currencySigUSD, currencySigRSV, currencyDexyGold];
		} else {
			// If from == SigUSD or SigRSV, forced to ERG
			return [currencyERG];
		}
	}

	//  Colors for the circles (helper)
	function tokenColor(ticker: string) {
		return {
			ERG: 'bg-orange-500',
			SigUSD: 'bg-green-500',
			SigRSV: 'bg-[#4A90E2]',
			DexyGold: 'bg-[yellow]'
		}[ticker];
	}

	function saveFromToCurrencyToLocalStorage() {
		localStorage.setItem('fromCurrency', JSON.stringify(fromCurrency));
		localStorage.setItem('toCurrency', JSON.stringify(toCurrency));
	}

	function loadFromToCurrencyFromLocalStorage() {
		const savedFromCurrency = localStorage.getItem('fromCurrency');
		const savedToCurrency = localStorage.getItem('toCurrency');

		if (savedFromCurrency) {
			fromCurrency = JSON.parse(savedFromCurrency);
		}
		if (savedToCurrency) {
			toCurrency = JSON.parse(savedToCurrency);
		}
	}

	/* ---------------------------------------
	 * onMount: load / subscribe / etc.
	 * ------------------------------------- */
	onMount(() => {
		loadFromToCurrencyFromLocalStorage();
		oracle_box.subscribe((oracleBox) => {
			doRecalc(oracleBox, $bank_box);
		});

		bank_box.subscribe((bankBox) => {
			doRecalc($oracle_box, bankBox);
		});

		bank_price_usd_sell.subscribe((val) => {
			window.document.title = `↑${val} ↓${$bank_price_usd_buy} | SigUSD`;
		});
		bank_price_usd_buy.subscribe((val) => {
			window.document.title = `↑${$bank_price_usd_sell} ↓${val} | SigUSD`;
		});

		web3wallet_wallet_used_addresses.subscribe((addr) => {
			if (addr) {
				confirmed_interactions.update((list) =>
					list.map((i) => {
						i.own = isOwnTx(i.tx, addr);
						return i;
					})
				);
				mempool_interactions.update((list) =>
					list.map((i) => {
						i.own = isOwnTx(i.tx, addr);
						return i;
					})
				);
			}
		});

		window.addEventListener('click', handleGlobalClick);
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('click', handleGlobalClick);
			window.removeEventListener('keydown', handleGlobalKeydown);
		};
	});

	/* ---------------------------------------
	 * BankBox + Oracle helper
	 * ------------------------------------- */
	function updateBankStats() {
		const { reserveRate, leftUSD, rightUSD, leftERG, rightERG, leftRSV, rightRSV } =
			calculateReserveRateAndBorders(
				$bankBoxInNanoErg,
				$bankBoxInCircSigUsdInCent,
				$oraclePriceSigUsd,
				$bank_price_rsv_buy,
				$bank_price_rsv_sell
			);

		reserve_rate.set(reserveRate);
		reserve_border_left_USD.set(leftUSD);
		reserve_border_left_ERG.set(leftERG);
		reserve_border_right_USD.set(rightUSD);
		reserve_border_right_ERG.set(rightERG);
		reserve_border_left_RSV.set(leftRSV);
		reserve_border_right_RSV.set(rightRSV);
	}
	async function updateBankBoxAndOracle(oracleBox: ErgoBox, bankBox: ErgoBox) {
		const { inErg, inCircSigUSD, oraclePrice, inCircSigRSV } = extractBoxesData(oracleBox, bankBox);
		bankBoxInNanoErg.set(inErg);
		bankBoxInCircSigUsdInCent.set(inCircSigUSD);
		bankBoxInCircSigRsv.set(inCircSigRSV);
		oraclePriceSigUsd.set(oraclePrice);
	}

	function initialInputs(
		bankBoxInNanoErg: bigint,
		bankBoxInCircSigUsdInCent: bigint,
		bankBoxInCircSigRSV: bigint,
		oraclePriceSigUsd: bigint,
		feeMining: bigint
	) {
		// Calculate initial SigUSD "buy" price for 0.1 ERG (BASE_INPUT_AMOUNT_ERG)
		const { totalSigUSD: totalSigUSDBuy, finalPrice: finalPriceBuy } = calculateInputsUsdErgInErg(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			feeMining
		);

		bank_price_usd_buy.set(finalPriceBuy);

		const { totalSigUSD: totalSigUSDSell, finalPrice: finalPriceSell } = calculateInputsUsdErgInErg(
			directionSell,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_usd_sell.set(finalPriceSell);

		// Calculate initial SigRSV "buy" price for 0.1 ERG
		const { finalPrice: finalPriceBuyRSV } = calculateInputsRSVErgInErg(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			bankBoxInCircSigRSV,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_rsv_buy.set(finalPriceBuyRSV);

		const { finalPrice: finalPriceSellRSV } = calculateInputsRSVErgInErg(
			directionSell,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			bankBoxInCircSigRSV,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_rsv_sell.set(finalPriceSellRSV);

		// We'll just set some initial example input
		fromAmount = BASE_INPUT_AMOUNT_ERG.toString(); // e.g. "0.1"
		toAmount = totalSigUSDBuy; // e.g. "10"
		swapPrice = finalPriceBuy; // e.g. real rate
	}

	/* ---------------------------------------
	 * Recalculation logic
	 * ------------------------------------- */
	function doRecalc(oracleBox: ErgoBox, bankBox: ErgoBox) {
		if (!oracleBox || !bankBox) return;
		updateBankBoxAndOracle(oracleBox, bankBox);
		if (fromAmount == '' && toAmount == '' && swapPrice == 0.0) {
			initialInputs(
				$bankBoxInNanoErg,
				$bankBoxInCircSigUsdInCent,
				$bankBoxInCircSigRsv,
				$oraclePriceSigUsd,
				$fee_mining
			);
		}
		updateBankStats();

		// If both sides are empty, reset
		if (!fromAmount && !toAmount) {
			swapPrice = 0;
			return;
		}

		const fromToken = fromCurrency.tokens[0];
		const toToken = toCurrency.tokens[0];

		// Distinguish direction based on last input:
		if (lastInput === 'From') {
			// User typed in `fromAmount`
			if (fromToken === 'ERG' && toToken === 'SigUSD') {
				// ERG -> SigUSD
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsUsdErgInErg(
					directionBuy,
					fromAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$oraclePriceSigUsd,
					$fee_mining
				);
				toAmount = totalSigUSD;
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
				swapPrice = finalPrice;
			} else if (fromToken === 'ERG' && toToken === 'SigRSV') {
				// ERG -> SigRSV
				const { totalSigRSV, finalPrice, contractERG, uiFeeErg } = calculateInputsRSVErgInErg(
					directionBuy,
					fromAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$bankBoxInCircSigRsv,
					$oraclePriceSigUsd,
					$fee_mining
				);
				toAmount = totalSigRSV;
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
				swapPrice = finalPrice;
			} else if (fromToken === 'SigUSD' && toToken === 'ERG') {
				// SigUSD -> ERG
				const { totalErg, finalPrice } = calculateInputsUsdErgInUsd(
					directionSell,
					fromAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$oraclePriceSigUsd,
					$fee_mining
				);
				toAmount = totalErg;
				swapPrice = finalPrice;
			} else {
				// SigRSV -> ERG
				const { totalErg, finalPrice } = calculateInputsRSVErgInRSV(
					directionSell,
					fromAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$bankBoxInCircSigRsv,
					$oraclePriceSigUsd,
					$fee_mining
				);
				toAmount = totalErg;
				swapPrice = finalPrice;
			}
		} else {
			// lastInput === 'To' => user typed in `toAmount`
			if (fromToken === 'ERG' && toToken === 'SigUSD') {
				// user typed in "SigUSD" => figure out how many ERG
				const { totalErg, finalPrice } = calculateInputsUsdErgInUsd(
					directionBuy,
					toAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$oraclePriceSigUsd,
					$fee_mining
				);
				fromAmount = totalErg;
				swapPrice = finalPrice;
			} else if (fromToken === 'ERG' && toToken === 'SigRSV') {
				// user typed in "SigRSV"
				const { totalErg, finalPrice } = calculateInputsRSVErgInRSV(
					directionBuy,
					toAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$bankBoxInCircSigRsv,
					$oraclePriceSigUsd,
					$fee_mining
				);
				fromAmount = totalErg;
				swapPrice = finalPrice;
			} else if (fromToken === 'SigUSD' && toToken === 'ERG') {
				// user typed in "ERG" => figure out how many SigUSD
				const { totalSigUSD, finalPrice, contractERG, uiFeeErg } = calculateInputsUsdErgInErg(
					directionSell,
					toAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$oraclePriceSigUsd,
					$fee_mining
				);
				fromAmount = totalSigUSD;
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
				swapPrice = finalPrice;
			} else {
				// fromToken === 'SigRSV' && toToken === 'ERG'
				// user typed in "ERG" => figure out how many SigRSV
				const { totalSigRSV, finalPrice, contractERG, uiFeeErg } = calculateInputsRSVErgInErg(
					directionSell,
					toAmount,
					$bankBoxInNanoErg,
					$bankBoxInCircSigUsdInCent,
					$bankBoxInCircSigRsv,
					$oraclePriceSigUsd,
					$fee_mining
				);
				fromAmount = totalSigRSV;
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
		const newVal = event.target as HTMLSelectElement;
		// In a real scenario, you'd match newVal.value to one of our Currency objects
		// For demonstration, assume user picks among ["ERG","SigUSD","SigRSV"]:
		const picked = newVal.value;
		if (picked === 'ERG') fromCurrency = currencyERG;
		else if (picked === 'SigUSD') fromCurrency = currencySigUSD;
		else if (picked === 'SigRSV') fromCurrency = currencySigRSV;

		const allowed = getAllowedToCurrencies(fromCurrency);
		if (!allowed.find((c) => c.tokens[0] === toCurrency.tokens[0])) {
			toCurrency = allowed[0];
		}
		saveFromToCurrencyToLocalStorage();
		doRecalc($oracle_box, $bank_box);
	}

	function handleToCurrencyChange(event: Event) {
		const newVal = event.target as HTMLSelectElement;
		// Only relevant if fromCurrency is ERG
		const picked = newVal.value;
		if (picked === 'SigUSD') toCurrency = currencySigUSD;
		else if (picked === 'SigRSV') toCurrency = currencySigRSV;
		saveFromToCurrencyToLocalStorage();
		doRecalc($oracle_box, $bank_box);
	}

	function handleFromAmountChange(event: Event) {
		fromAmount = (event.target as HTMLInputElement).value;
		lastInput = 'From';
		doRecalc($oracle_box, $bank_box);
	}

	function handleToAmountChange(event: Event) {
		toAmount = (event.target as HTMLInputElement).value;
		lastInput = 'To';
		doRecalc($oracle_box, $bank_box);
	}

	async function handleSwapButton() {
		// Check direction based on the last typed field
		const fromToken = fromCurrency.tokens[0];
		const toToken = toCurrency.tokens[0];

		if (lastInput === 'From') {
			if (fromToken === 'ERG' && toToken === 'SigUSD') {
				await buyUSDInputERG(
					ergStringToNanoErgBigInt(fromAmount),
					$bank_box,
					$oracle_box,
					$fee_mining
				);
			} else if (fromToken === 'ERG' && toToken === 'SigRSV') {
				await buyRSVInputERG(
					ergStringToNanoErgBigInt(fromAmount),
					$bank_box,
					$oracle_box,
					$fee_mining
				);
			} else if (fromToken === 'SigUSD') {
				await sellUSDInputUSD(
					usdStringToCentBigInt(fromAmount),
					$bank_box,
					$oracle_box,
					$fee_mining
				);
			} else {
				// SigRSV -> ERG
				await sellRSVInputRSV(BigInt(fromAmount), $bank_box, $oracle_box, $fee_mining);
			}
		} else {
			// lastInput === 'To'
			if (fromToken === 'ERG' && toToken === 'SigUSD') {
				await buyUSDInputUSD(usdStringToCentBigInt(toAmount), $bank_box, $oracle_box, $fee_mining);
			} else if (fromToken === 'ERG' && toToken === 'SigRSV') {
				await buyRSVInputRSV(BigInt(toAmount), $bank_box, $oracle_box, $fee_mining);
			} else if (fromToken === 'SigUSD') {
				await sellUSDInputERG(
					ergStringToNanoErgBigInt(toAmount),
					$bank_box,
					$oracle_box,
					$fee_mining
				);
			} else {
				// SigRSV -> ERG
				await sellRSVInputERG(
					ergStringToNanoErgBigInt(toAmount),
					$bank_box,
					$oracle_box,
					$fee_mining
				);
			}
		}
	}

	function handleFromBalanceClick() {
		fromAmount = fromBalance;
		doRecalc($oracle_box, $bank_box);
	}

	function handleFeeChange(event: Event) {
		const val = (event.target as HTMLInputElement).value;
		fee_mining.set(BigInt(Number(val) * 10 ** 9)); // e.g. 0.01 => 10^7 (1e7) nanoERG
		doRecalc($oracle_box, $bank_box);
	}

	const toggleFeeSlider = () => {
		showFeeSlider = !showFeeSlider;
	};

	function handleSwapPair() {
		const temp = fromCurrency;
		fromCurrency = toCurrency;
		toCurrency = temp;
		saveFromToCurrencyToLocalStorage();
		doRecalc($oracle_box, $bank_box);
	}

	function handleMouseEnter() {
		currencySwapHovered = true;
	}

	function handleMouseLeave() {
		currencySwapHovered = false;
	}

	/* ---------------------------------------
	 * Reactive / Derived
	 * ------------------------------------- */
	// Display the user's balance for the "fromCurrency"
	$: fromBalance = (() => {
		const fromToken = fromCurrency.tokens[0];
		if (fromToken === 'ERG') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === ERGO_TOKEN_ID)?.amount || 0n;
			return nanoErgToErg(amt);
		} else if (fromToken === 'SigUSD') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigUSD_TOKEN_ID)?.amount || 0n;
			return centsToUsd(amt);
		} else {
			// SigRSV
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigRSV_TOKEN_ID)?.amount || 0n;
			// If SigRSV had decimals, convert as needed; for now, just show raw
			return amt.toString();
		}
	})();

	// e.g. "SigUSD mint prohibited..." (if needed)
	let mintWarning = '';

	window.addEventListener('click', handleGlobalClick);
	window.addEventListener('keydown', handleGlobalKeydown);

	function handleGlobalClick(e: MouseEvent) {
		const target = e.target as HTMLElement;

		const fromMenu = document.getElementById('fromDropdownMenu');
		const fromBtn = document.getElementById('fromDropdownBtn');
		const fromBtn2 = document.getElementById('fromDropdownBtn2');

		const toMenu = document.getElementById('toDropdownMenu');
		const toBtn = document.getElementById('toDropdownBtn');

		if (fromMenu && (fromBtn || fromBtn2)) {
			if (
				!fromMenu.contains(target) &&
				!(fromBtn?.contains(target) || fromBtn2?.contains(target))
			) {
				fromDropdownOpen = false;
			}
		}
		if (toMenu && toBtn) {
			if (!toMenu.contains(target) && !toBtn.contains(target)) {
				toDropdownOpen = false;
			}
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			fromDropdownOpen = false;
			toDropdownOpen = false;
		}
	}
</script>

<!-- UI Layout -->
<div class="mx-auto w-full max-w-md rounded-lg bg-gray-800 p-6 shadow">
	<!-- FROM SELECTION -->
	<div class="rounded-md bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3 text-gray-400">
			<span class="text-sm">From</span>
			<button
				class="flex items-center gap-1 text-sm hover:text-white"
				on:click={handleFromBalanceClick}
			>
				<WalletBalance />
				<!-- fromBalance is string if fromCurrency=SigRSV, or number otherwise -->
				{#if typeof fromBalance === 'number'}
					{@html fromBalance.toLocaleString('en-US', {
						minimumFractionDigits: 0,
						maximumFractionDigits: 2
					})}
				{:else}
					{@html fromBalance}
				{/if}
			</button>
		</div>

		<div
			class="relative flex flex-col rounded-lg bg-gray-900 focus-within:ring-1 focus-within:ring-blue-500"
			style="border: none!important; outline: none!important; box-shadow: none!important;"
		>
			<div class="flex">
				<!-- FROM AMOUNT -->
				<input
					type="number"
					class="w-full bg-transparent text-3xl text-gray-100 outline-none"
					placeholder="0"
					min="0"
					bind:value={fromAmount}
					on:input={handleFromAmountChange}
				/>

				<!-- FROM CURRENCY DROPDOWN -->
				<!-- Toggle button -->
				<button
					id="fromDropdownBtn"
					type="button"
					style="width:285px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
					class="flex w-full items-center justify-between rounded-lg border-gray-800 bg-gray-900 px-3 py-2 font-medium text-gray-100 outline-none"
					on:click={() => {
						fromDropdownOpen = !fromDropdownOpen;
						toDropdownOpen = false;
					}}
				>
					<div class="flex items-center gap-3">
						<!-- Show the first token name, e.g. "ERG" -->
						<div class="h-5 w-5 {tokenColor(fromCurrency.tokens[0])} rounded-full"></div>
						{fromCurrency.tokens[0]}
					</div>
					{#if !fromCurrency.isLpPool}
						<svg
							class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M12 15.5l-6-6h12l-6 6z" />
						</svg>
					{/if}
				</button>
			</div>

			<!-- LP second token START -->
			{#if fromCurrency.isLpPool}
				<div class="flex">
					<!-- FROM AMOUNT -->
					<input
						type="number"
						class="w-full bg-transparent text-3xl text-gray-100 outline-none"
						placeholder="0"
						min="0"
						bind:value={fromAmount2}
						on:input={handleFromAmountChange}
					/>

					<!-- FROM CURRENCY DROPDOWN -->
					<!-- Toggle button -->
					<button
						id="fromDropdownBtn2"
						type="button"
						style="width:285px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
						class="flex w-full items-center justify-between rounded-lg border-gray-800 bg-gray-900 px-3 py-2 font-medium text-gray-100 outline-none"
						on:click={() => {
							fromDropdownOpen = !fromDropdownOpen;
							toDropdownOpen = false;
						}}
					>
						<div class="flex items-center gap-3">
							<!-- Show the first token name, e.g. "ERG" -->
							<div class="h-5 w-5 {tokenColor(fromCurrency.tokens[1])} rounded-full"></div>
							{fromCurrency.tokens[1]}
						</div>
						<svg
							class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M12 15.5l-6-6h12l-6 6z" />
						</svg>
					</button>
				</div>
			{/if}
			<!-- LP second token END -->

			<!-- Dropdown list -->
			{#if fromDropdownOpen}
				<div
					id="fromDropdownMenu"
					style="width: 408px; border-top-left-radius:0px; border-top-right-radius:0px;top:{fromCurrency.isLpPool
						? '116'
						: '58'}px;margin-right:-4px"
					class="absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 border-gray-800 bg-gray-900 shadow-md ring-1 ring-black ring-opacity-5"
				>
					<div>
						{#each fromCurrencies as c, i}
							<button
								class="text-md flex w-full items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-600 hover:text-white"
								style="height:56px"
								on:click={() => {
									fromCurrency = c;
									fromDropdownOpen = false;
									const allowed = getAllowedToCurrencies(fromCurrency);
									if (!allowed.find((item) => item.tokens[0] === toCurrency.tokens[0])) {
										toCurrency = allowed[0];
									}
									saveFromToCurrencyToLocalStorage();
									doRecalc($oracle_box, $bank_box);
								}}
							>
								{#if c.isLpToken}
									<div class="flex w-full items-center justify-between text-sm">
										<div class="pl-1">
											<div class="flex items-center gap-4">
												<div class="h-3 w-3 flex-shrink-0 {tokenColor(c)} rounded-full"></div>

												{c.tokens[0]}
											</div>
											<div class="flex items-center gap-4">
												<div class="h-3 w-3 flex-shrink-0 {tokenColor(c)} rounded-full"></div>

												{c.tokens[1]}
											</div>
										</div>
										<div class="grow pl-2 text-center">
											<div class="text-xs">LP</div>
											<div class="text-xs">Token</div>
										</div>
									</div>
								{:else if c.isLpPool}
									<div class="flex w-full items-center justify-between text-sm">
										<div class="pl-1">
											<div class="flex items-center gap-4">
												<div class="h-3 w-3 flex-shrink-0 {tokenColor(c)} rounded-full"></div>

												{c.tokens[0]}
											</div>
											<div class="flex items-center gap-4">
												<div class="h-3 w-3 flex-shrink-0 {tokenColor(c)} rounded-full"></div>

												{c.tokens[1]}
											</div>
										</div>

										<div class="text-center">
											<div class="text-xs">Liquidity</div>
											<div class="text-xs">Pool</div>
										</div>
									</div>
								{:else}
									<div class="h-5 w-5 flex-shrink-0 {tokenColor(c)} rounded-full"></div>
									{c.tokens[0]}
								{/if}
							</button>
							{#if i != fromCurrencies.length - 1}
								<hr class="border-slate-800" />
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- SWAP PAIR SELECTION -->
	<div class="relative" style="height:4px;">
		<div
			class="absolute flex w-full justify-center"
			class:hidden={fromDropdownOpen}
			style="z-index:5;margin-top:-18px;"
		>
			<button
				on:mouseenter={handleMouseEnter}
				on:mouseleave={handleMouseLeave}
				on:click={handleSwapPair}
				class="flex items-center justify-center rounded-full border-4 border-gray-800 bg-gray-900 px-1 py-1 text-gray-400 hover:text-white hover:[&>svg:first-child]:hidden hover:[&>svg:last-child]:block"
				style="width:42px;height:42px;"
			>
				<!-- If hovered, show ArrowUpDown; otherwise show ArrowDown -->
				{#if currencySwapHovered}
					<ArrowUpDown size={20} />
				{:else}
					<ArrowDown />
				{/if}
			</button>
		</div>
	</div>

	<!-- TO SELECTION -->
	<div class="rounded-md bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3 text-gray-400">
			<span class="text-sm">To</span>
			<span class="text-sm"
				>Price:
				<!-- If SigRSV is involved, show SubNumber(1 / swapPrice) as example -->
				{#if toCurrency.tokens[0] === 'SigRSV' || fromCurrency.tokens[0] === 'SigRSV'}
					<SubNumber value={1 / swapPrice}></SubNumber>
				{:else}
					{swapPrice}
				{/if}
			</span>
		</div>

		<div
			class="flex items-center rounded-lg bg-gray-900 focus-within:ring-1 focus-within:ring-blue-500"
			style="border: none!important; outline: none!important; box-shadow: none!important;"
		>
			<!-- TO AMOUNT -->
			<input
				type="number"
				class="w-full bg-transparent text-3xl text-gray-100 outline-none"
				placeholder="0"
				min="0"
				bind:value={toAmount}
				on:input={handleToAmountChange}
			/>

			<!-- TO CURRENCY SELECT OR FIXED -->
			<div
				class="relative flex w-72 items-center gap-2 rounded-lg border-gray-800 bg-gray-900 px-3 py-2"
				style="height:62px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px;"
			>
				{#if fromCurrency.tokens[0] === 'ERG'}
					<!-- Toggle button (can be SigUSD or SigRSV) -->
					<button
						id="toDropdownBtn"
						type="button"
						class="flex w-full items-center justify-between font-medium text-gray-100 outline-none"
						on:click={() => {
							toDropdownOpen = !toDropdownOpen;
							fromDropdownOpen = false;
						}}
					>
						<div class="flex items-center gap-3">
							<div class="h-5 w-5 {tokenColor(toCurrency)} rounded-full"></div>
							{toCurrency.tokens[0]}
						</div>
						<svg
							class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M12 15.5l-6-6h12l-6 6z" />
						</svg>
					</button>

					<!-- Dropdown list -->
					{#if toDropdownOpen}
						<div
							id="toDropdownMenu"
							style="width: 173px; border-top-left-radius:0px; border-top-right-radius:0px;top:54px; right:-4px"
							class="absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 border-gray-800 bg-gray-900 shadow-md ring-1 ring-black ring-opacity-5"
						>
							<div class="py-1">
								{#each getAllowedToCurrencies(currencyERG) as c}
									<button
										class="text-md block flex w-full gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-600 hover:text-white"
										on:click={() => {
											toCurrency = c;
											toDropdownOpen = false;
											saveFromToCurrencyToLocalStorage();
											doRecalc($oracle_box, $bank_box);
										}}
									>
										<div class="h-5 w-5 flex-shrink-0 {tokenColor(c)} rounded-full"></div>
										{c.tokens[0]}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				{:else}
					<!-- forced 'ERG' label if fromCurrency is SigUSD or SigRSV -->
					<div class="h-5 w-5 {tokenColor(currencyERG)} rounded-full"></div>
					<span class="ml-3 font-medium text-gray-400">ERG</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Fee Settings (Expert) -->
	{#if mintWarning}
		<div class="my-4 flex flex w-full justify-center text-red-500">
			{mintWarning}
		</div>
	{/if}
	<div
		class={`mb-4 overflow-hidden transition-all duration-300 ${
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
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
		/>
		<div class="mt-2 text-center text-sm text-gray-400">
			Miner Fee: {minerFee.toFixed(2)} ERG
		</div>
	</div>
	<!-- Swap Button -->
	{#if mintWarning}
		<button
			on:click={handleSwapButton}
			class="w-full rounded-lg bg-gray-600 py-3 font-medium text-white hover:bg-gray-500"
		>
			Swap
		</button>
	{:else if $web3wallet_available_wallets.length == 0}
		<a
			target="_blank"
			href={getWalletInstallLink()}
			class="flex w-full justify-center rounded-lg bg-orange-600 py-3 font-medium text-white hover:bg-orange-500"
		>
			Install Wallet
		</a>
	{:else}
		<div class="flex">
			<button
				on:click={toggleFeeSlider}
				class="mr-1 rounded-lg bg-orange-600 px-4 py-3 font-medium text-orange-300 hover:bg-orange-500 hover:text-white"
			>
				<Gear></Gear>
			</button>
			<button
				on:click={handleSwapButton}
				class="grow rounded-lg bg-orange-600 py-3 font-medium text-white hover:bg-orange-500"
			>
				Swap
			</button>
		</div>
	{/if}
</div>
