<script lang="ts">
	import BigNumber from 'bignumber.js';
	import type { ErgoBox } from 'ergo-lib-wasm-nodejs';
	import { ArrowDown, ArrowUpDown } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { DIRECTION_BUY, DIRECTION_SELL, SIGUSD_BANK_ADDRESS } from '../api/ergoNode';
	import { createInteractionAndSubmitTx, getWeb3WalletData } from '../asdf';
	import Gear from '../icons/Gear.svelte';
	import Tint from '../icons/Tint.svelte';
	import WalletBalance from '../icons/WalletBalance.svelte';
	import { getWalletInstallLink } from '../installWallet';
	import PrimaryButton from '../PrimaryButton.svelte';
	import { buildSwapSigmaUsdTx } from '../sigmausd/sigmaUSD';
	import { calculateReserveRateAndBorders } from '../sigmausd/sigmaUSDBankWidget';
	import {
		BASE_INPUT_AMOUNT_ERG,
		calculateAmountAndSwapPrice,
		calculateInputsRSVErgInErg,
		calculateInputsRSVErgInRSV,
		calculateInputsUsdErgInErg,
		calculateInputsUsdErgInUsd
	} from '../sigmausd/sigmaUSDInputRecalc';
	import { parseErgUsdOracleBox, parseSigUsdBankBox } from '../sigmausd/sigmaUSDParser';
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
		reserve_rate
	} from '../stores/bank';
	import { ERGO_TOKEN_ID, SigRSV_TOKEN_ID, SigUSD_TOKEN_ID } from '../stores/ergoTokens';
	import { confirmed_interactions, mempool_interactions } from '../stores/preparedInteractions';
	import { headline } from '../stores/ui';
	import {
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_wallet_used_addresses
	} from '../stores/web3wallet';
	import SubNumber from '../SubNumber.svelte';
	import SwapWidgetTokenRow from '../SwapWidgetTokenRow.svelte';
	import {
		centsToUsd,
		ergStringToNanoErgBigInt,
		isOwnTx,
		nanoErgToErg,
		usdStringToCentBigInt
	} from '../utils';
	import {
		currencyERG,
		currencyErgDexyGoldLpPool,
		currencyErgDexyGoldLpToken,
		fromCurrencies,
		getAllowedToCurrencies,
		tokenColor
	} from './Currency';
	import type { Currency, LastUserInput } from './SwapWidget.types';

	/* ---------------------------------------
	 * Local variables
	 * ------------------------------------- */
	let fromCurrency: Currency = currencyErgDexyGoldLpToken;
	let toCurrency: Currency = currencyErgDexyGoldLpPool;
	let fromAmount = '';
	let fromAmount2 = '';
	let toAmount = '';
	let toAmount2 = '';
	let swapPrice: number = 0.0;
	let lastInput: LastUserInput = 'From';

	let minerFee = 0.01;
	let showFeeSlider = false;

	let fromDropdownOpen = false;
	let toDropdownOpen = false;
	let currencySwapHovered = false;

	//  Colors for the circles (helper)

	function saveFromToCurrencyToLocalStorage() {
		localStorage.setItem('fromCurrency', JSON.stringify(fromCurrency));
		localStorage.setItem('toCurrency', JSON.stringify(toCurrency));
	}

	function loadFromToCurrencyFromLocalStorage() {
		try {
			const savedFromCurrency = localStorage.getItem('fromCurrency');
			const savedToCurrency = localStorage.getItem('toCurrency');

			if (savedFromCurrency) {
				fromCurrency = JSON.parse(savedFromCurrency);
			}
			if (savedToCurrency) {
				toCurrency = JSON.parse(savedToCurrency);
			}
			updateTitle();
		} catch (e) {
			// Gotta catch 'em all.
		}
	}

	function updateTitle() {
		if (
			(fromCurrency.isToken && ['SigUSD', 'SigRSV'].includes(fromCurrency.tokens[0])) ||
			(toCurrency.isToken && ['SigUSD', 'SigRSV'].includes(toCurrency.tokens[0]))
		) {
			headline.set('SigmaUsd');
		} else {
			headline.set('DexyGold');
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

	function initialInputs(
		bankBoxInNanoErg: bigint,
		bankBoxInCircSigUsdInCent: bigint,
		bankBoxInCircSigRsv: bigint,
		oraclePriceSigUsd: bigint,
		feeMining: bigint
	) {
		// Calculate initial SigUSD "buy" price for 0.1 ERG (BASE_INPUT_AMOUNT_ERG)
		const { totalSigUSD: totalSigUSDBuy, finalPrice: finalPriceBuy } = calculateInputsUsdErgInErg(
			DIRECTION_BUY,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			feeMining
		);

		bank_price_usd_buy.set(finalPriceBuy);

		const { totalSigUSD: totalSigUSDSell, finalPrice: finalPriceSell } = calculateInputsUsdErgInErg(
			DIRECTION_SELL,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_usd_sell.set(finalPriceSell);

		// Calculate initial SigRSV "buy" price for 0.1 ERG
		const { finalPrice: finalPriceBuyRSV } = calculateInputsRSVErgInErg(
			DIRECTION_BUY,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			bankBoxInCircSigRsv,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_rsv_buy.set(finalPriceBuyRSV);

		const { finalPrice: finalPriceSellRSV } = calculateInputsRSVErgInErg(
			DIRECTION_SELL,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()),
			bankBoxInNanoErg,
			bankBoxInCircSigUsdInCent,
			bankBoxInCircSigRsv,
			oraclePriceSigUsd,
			feeMining
		);
		bank_price_rsv_sell.set(finalPriceSellRSV);

		// We'll just set some initial example input
		fromAmount = nanoErgToErg(BASE_INPUT_AMOUNT_ERG); // e.g. "0.1"
		toAmount = totalSigUSDBuy; // e.g. "10"
		swapPrice = finalPriceBuy; // e.g. real rate
	}

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
		const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
		const { oraclePrice } = parseErgUsdOracleBox(oracleBox);
		bankBoxInNanoErg.set(inErg);
		bankBoxInCircSigUsdInCent.set(inCircSigUSD);
		bankBoxInCircSigRsv.set(inCircSigRSV);
		oraclePriceSigUsd.set(oraclePrice);
	}

	/* ---------------------------------------
	 * Recalculation logic
	 * ------------------------------------- */

	function recalcAmountAndPrice() {
		const fromToken = fromCurrency.tokens[0];
		const toToken = toCurrency.tokens[0];
		const { from, to, price } = calculateAmountAndSwapPrice(
			lastInput,
			fromToken,
			fromAmount,
			toToken,
			toAmount,
			$bankBoxInNanoErg,
			$bankBoxInCircSigUsdInCent,
			$bankBoxInCircSigRsv,
			$fee_mining
		)!;
		swapPrice = price;
		if (from) {
			fromAmount = from;
		}
		if (to) {
			toAmount = to;
		}
	}

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

		recalcAmountAndPrice();
	}

	/* ---------------------------------------
	 * Handlers
	 * ------------------------------------- */
	function handleFromAmountChange(event: Event) {
		fromAmount = (event.target as HTMLInputElement).value;
		lastInput = 'From';
		doRecalc($oracle_box, $bank_box);
	}

	function handleFromAmount2Change(event: Event) {
		fromAmount2 = (event.target as HTMLInputElement).value;
		lastInput = 'From';
		doRecalc($oracle_box, $bank_box);
	}

	function handleToAmountChange(event: Event) {
		toAmount = (event.target as HTMLInputElement).value;
		lastInput = 'To';
		doRecalc($oracle_box, $bank_box);
	}

	function handleToAmount2Change(event: Event) {
		toAmount2 = (event.target as HTMLInputElement).value;
		lastInput = 'To';
		doRecalc($oracle_box, $bank_box);
	}

	/* prettier-ignore */
	async function handleSwapButton() {
		// Check direction based on the last typed field

		let fromAmountX:bigint=0n;
		let toAmountX:bigint=0n;
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'ERG') 	  fromAmountX = ergStringToNanoErgBigInt(fromAmount);
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'SigUSD') fromAmountX = usdStringToCentBigInt(fromAmount);
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'SigRSV') fromAmountX = BigInt(fromAmount);
		if (lastInput === 'To'	 && toCurrency.tokens[0] === 'ERG') 	  toAmountX = ergStringToNanoErgBigInt(toAmount);
		if (lastInput === 'To'	 && toCurrency.tokens[0] === 'SigUSD')   toAmountX = usdStringToCentBigInt(toAmount);
		if (lastInput === 'To'	 && toCurrency.tokens[0] === 'SigRSV')   toAmountX = BigInt(toAmount);
		const fromAsset = {
			token: fromCurrency.tokens[0],
			amount: fromAmountX
		}
		const toAsset = {
			token: toCurrency.tokens[0],
			amount: toAmountX
		}

		const { me, utxos, height } = await getWeb3WalletData();
		const unsignedTx = buildSwapSigmaUsdTx(fromAsset, toAsset, lastInput, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining)

		await createInteractionAndSubmitTx(unsignedTx, [me]);
	}

	function handleFromBalanceClick() {
		fromAmount = Number.parseFloat(fromBalance.replaceAll(',', '')).toString();
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
		updateTitle();
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

	/* ---------------------------------------
	 * Dropdowns
	 * ------------------------------------- */
	window.addEventListener('click', handleGlobalClick);
	window.addEventListener('keydown', handleGlobalKeydown);

	function handleGlobalClick(e: MouseEvent) {
		const target = e.target as HTMLElement;

		const fromMenu = document.getElementById('fromDropdownMenu');
		const fromBtn = document.getElementById('fromDropdownBtn');
		const fromBtn2 = document.getElementById('fromDropdownBtn2');

		const toMenu = document.getElementById('toDropdownMenu');
		const toBtn = document.getElementById('toDropdownBtn');
		const toBtn2 = document.getElementById('toDropdownBtn2');

		if (fromMenu && (fromBtn || fromBtn2)) {
			if (
				!fromMenu.contains(target) &&
				!(fromBtn?.contains(target) || fromBtn2?.contains(target))
			) {
				fromDropdownOpen = false;
			}
		}
		if (toMenu && (toBtn || toBtn2)) {
			if (!toMenu.contains(target) && !(toBtn?.contains(target) || toBtn2?.contains(target))) {
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
	let fromBtnRect = { top: 0, left: 0, width: 0 };
	let toBtnRect = { top: 0, left: 0, width: 0 };
	function toggleFromDropdown(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		fromBtnRect = { top: rect.bottom, left: rect.left, width: rect.width };
		fromDropdownOpen = !fromDropdownOpen;
		toDropdownOpen = false;
	}
	function toggleToDropdown(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		toBtnRect = { top: rect.bottom, left: rect.left, width: rect.width };
		toDropdownOpen = !toDropdownOpen;
		fromDropdownOpen = false;
	}
</script>

<!-- UI Layout -->
<div class="widget relative">
	<div
		class="clipped mx-auto w-full max-w-md rounded-xl rounded-br-none border border-gray-800"
		class:clip-long={fromCurrency.isLpPool || toCurrency.isLpPool}
		class:clip-short={!(fromCurrency.isLpPool || toCurrency.isLpPool)}
		style="padding:8px"
	>
		<!-- FROM SELECTION -->
		<div
			class="flex flex-col transition-all"
			class:justify-between={fromCurrency.isLpPool}
			style={fromCurrency.isLpToken || toCurrency.isLpToken
				? 'min-height:258px'
				: 'min-height:200px'}
		>
			<div>
				<div class="rounded-md rounded-bl-none bg-gray-800">
					<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3 text-gray-400">
						<span class="text-sm"
							>{fromCurrency.isLpPool
								? 'Add Liquidity'
								: fromCurrency.isLpToken
									? 'Remove Liquidity'
									: 'From'}</span
						>
						<button
							class="flex items-center gap-1 text-sm hover:text-white"
							on:click={handleFromBalanceClick}
						>
							<!-- fromBalance is string if fromCurrency=SigRSV, or number otherwise -->
							{#if fromCurrency.isLpPool}
								{fromBalance} {fromCurrency.tokens[0]} {fromBalance} {fromCurrency.tokens[1]}
							{:else if typeof fromBalance === 'number'}
								{fromBalance.toLocaleString('en-US', {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2
								})}
							{:else}
								<WalletBalance />
								{fromBalance}
							{/if}
						</button>
					</div>

					<div
						class="relative flex flex-col bg-gray-800 focus-within:ring-1 focus-within:ring-blue-500"
						style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {!fromCurrency.isLpPool
							? '58px'
							: '116px'}; "
					>
						<div class="flex">
							<!-- FROM AMOUNT -->
							<input
								type="number"
								class="w-[256px] bg-transparent text-3xl text-gray-100 outline-none"
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
								style="width:271px; border-right:none; margin-bottom:-4px; border-width:4px;  height:62px;"
								class="border-color flex w-full items-center justify-between rounded-lg rounded-bl-none rounded-br-none rounded-tr-none bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
								on:click={toggleFromDropdown}
							>
								{#if fromCurrency.isLpToken}
									<div class="flex items-center gap-3 text-white">
										<div class="text-lg text-blue-300"><Tint></Tint></div>
										<div class=" leading-0 flex w-full flex-col justify-center text-xs">
											<div>Liquidity</div>
											<div>Token</div>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3">
										<!-- Show the first token name, e.g. "ERG" -->
										<div class="h-5 w-5 {tokenColor(fromCurrency.tokens[0])} rounded-full"></div>
										{fromCurrency.tokens[0]}
									</div>
								{/if}
								{#if fromCurrency.isToken || fromCurrency.isLpToken}
									<svg
										class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={fromCurrency.isLpToken ? 'gray' : 'currentColor'}
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
								<div style="border-top-width:4px;" class="border-color w-[256px]">
									<input
										type="number"
										class="w-[256px] bg-transparent text-3xl text-gray-100 outline-none"
										placeholder="0"
										min="0"
										bind:value={fromAmount2}
										on:input={handleFromAmount2Change}
									/>
								</div>

								<!-- FROM CURRENCY DROPDOWN -->
								<!-- Toggle button -->
								<button
									id="fromDropdownBtn2"
									type="button"
									style="border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px; border-top-width:{fromCurrency.isLpPool
										? 4
										: 4}px; {fromCurrency.isLpPool ? ' border-top-left-radius:0' : ''}"
									class=" border-color flex items-center justify-between rounded-lg rounded-br-none bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
									on:click={toggleFromDropdown}
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
										fill={toCurrency.isToken ? 'currentColor' : 'gray'}
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								</button>
							</div>
						{/if}
						<!-- LP second token END -->
					</div>
				</div>

				<!-- DIRECTION -->
				<div class="relative" style="height:4px;">
					<div class="absolute" style="z-index:5;margin-top:-18px; left:170px">
						<button
							on:mouseenter={handleMouseEnter}
							on:mouseleave={handleMouseLeave}
							on:click={handleSwapPair}
							class="border-color flex items-center justify-center rounded-full border-4 bg-gray-800 px-1 py-1 text-gray-400 hover:text-white hover:[&>svg:first-child]:hidden hover:[&>svg:last-child]:block"
							style="width:42px;height:42px;"
						>
							{#if currencySwapHovered}
								<ArrowUpDown size={20} />
							{:else}
								<ArrowDown />
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- TO SELECTION -->
			<div class="bg-gray-800">
				<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3 text-gray-400">
					<span class="text-sm">{toCurrency.isLpPool || toCurrency.isLpToken ? 'Get' : 'To'}</span>
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
					class="relative flex flex-col rounded-lg rounded-bl-none bg-gray-800 transition-all focus-within:ring-1 focus-within:ring-blue-500"
					style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {!toCurrency.isLpPool
						? '58px'
						: '116px'}; "
				>
					<div class="flex">
						<!-- TO AMOUNT -->
						<input
							type="number"
							class="w-[256px] bg-transparent text-3xl text-gray-100 outline-none"
							placeholder="0"
							min="0"
							bind:value={toAmount}
							on:input={handleToAmountChange}
						/>

						<!-- TO CURRENCY DROPDOWN -->
						<!-- Toggle button -->
						<button
							id="toDropdownBtn"
							type="button"
							style="width: 271px; border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
							class=" border-color flex w-full items-center justify-between rounded-lg rounded-br-none bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
							on:click={toggleToDropdown}
						>
							{#if toCurrency.isLpToken}
								<div class="flex items-center gap-3 text-white">
									<div class="text-lg text-blue-300"><Tint></Tint></div>
									<div class=" leading-0 flex w-full flex-col justify-center text-xs">
										<div>Liquidity</div>
										<div>Token</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<!-- Show the first token name, e.g. "ERG" -->
									<div class="h-5 w-5 {tokenColor(toCurrency.tokens[0])} rounded-full"></div>
									{toCurrency.tokens[0]}
								</div>
							{/if}
							{#if toCurrency.isToken || toCurrency.isLpToken}
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
					{#if toCurrency.isLpPool}
						<div class="flex">
							<!-- FROM AMOUNT -->
							<div style="border-top-width:4px;" class="border-color w-[256px]">
								<input
									type="number"
									class="w-[256px] bg-transparent text-3xl text-gray-100 outline-none"
									placeholder="0"
									min="0"
									bind:value={toAmount2}
									on:input={handleToAmount2Change}
								/>
							</div>

							<!-- FROM CURRENCY DROPDOWN -->
							<!-- Toggle button -->
							<button
								id="toDropdownBtn2"
								type="button"
								style="width: 166px; border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-right-radius:0px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px; border-top-width:{toCurrency.isLpPool
									? 4
									: 4}px; {toCurrency.isLpPool ? ' border-top-left-radius:0' : ''}"
								class="border-color flex w-full items-center justify-between bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
								on:click={toggleToDropdown}
							>
								<div class="flex items-center gap-3">
									<!-- Show the first token name, e.g. "ERG" -->
									<div class="h-5 w-5 {tokenColor(toCurrency.tokens[1])} rounded-full"></div>
									{toCurrency.tokens[1]}
								</div>
								<svg
									class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill={toCurrency.isToken ? 'currentColor' : 'gray'}
								>
									<path d="M12 15.5l-6-6h12l-6 6z" />
								</svg>
							</button>
						</div>
					{/if}
					<!-- LP second token END -->
				</div>
			</div>
		</div>

		<!-- Fee Settings (Expert) -->
		<div
			class={` overflow-hidden transition-all duration-300 ${
				showFeeSlider ? 'max-h-24 py-4' : 'max-h-0'
			}`}
			style={'margin-bottom:6px'}
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
		{#if $web3wallet_available_wallets.length == 0}
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
					style="display:none"
					on:click={toggleFeeSlider}
					class="mr-1 rounded-lg bg-gray-500 px-4 py-3 font-medium text-gray-200 hover:bg-gray-100 hover:text-black"
				>
					<Gear></Gear>
				</button>
				<PrimaryButton onClick={handleSwapButton} text="Swap_" subtext={$headline}></PrimaryButton>
			</div>
		{/if}
	</div>
</div>

<!-- Dropdown list -->
{#if fromDropdownOpen}
	<div
		id="fromDropdownMenu"
		style="width: 250px; border-top-left-radius:0px; border-top-right-radius:0px;left: {fromBtnRect.left}px;top:{fromBtnRect.top -
			4}px; border-right:none"
		class="border-color absolute right-0 z-30 w-28 origin-top-right rounded-md rounded-br-none border-4 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
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
						toCurrency = allowed[0];
						saveFromToCurrencyToLocalStorage();
						doRecalc($oracle_box, $bank_box);
						updateTitle();
					}}
				>
					<SwapWidgetTokenRow {c}></SwapWidgetTokenRow>
				</button>
				{#if i != fromCurrencies.length - 1}
					<hr class="border-slate-800" />
				{/if}
			{/each}
		</div>
	</div>
{/if}

<!-- Dropdown list -->
{#if toDropdownOpen}
	<div
		id="toDropdownMenu"
		style="width: 250px; border-top-left-radius:0px; border-top-right-radius:0px;
		left: {toBtnRect.left}px;
		top:{toBtnRect.top - 4}px; border-right:none"
		class="border-color absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
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
						updateTitle();
					}}
				>
					<SwapWidgetTokenRow {c}></SwapWidgetTokenRow>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.clip-short {
		clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 6.4% 100%, 0% 90.2%);
	}
	.clipped {
		position: relative;
		border-width: 4px;
	}
	.clip-long {
		clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 6.2% 100%, 0% 92%);
	}

	.clipped::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;

		width: 0;
		height: 0;

		border-bottom: 26px solid #1f2937;
		border-right: 26px solid transparent;
	}

	.border-color {
		border-color: #16151f;
	}
	/* https://yandex.ru/images/search?from=tabbar&img_url=https%3A%2F%2Fceles.club%2Fuploads%2Fposts%2F2022-10%2F1667213180_56-celes-club-p-zolotoi-fon-odnotonnii-oboi-56.jpg&lr=10410&p=1&pos=3&rpt=simage&text=gold%20texture */
</style>
