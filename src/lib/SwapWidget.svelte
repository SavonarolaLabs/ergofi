<script lang="ts">
	import { onMount } from 'svelte';

	import BigNumber from 'bignumber.js';

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
		reserve_rate
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
	import SwapWidgetTokenRow from './SwapWidgetTokenRow.svelte';
	import { headline } from './stores/ui';
	import { directionBuy, directionSell, SIGUSD_BANK_ADDRESS } from './api/ergoNode';
	import Tint from './icons/Tint.svelte';
	import { createInteractionAndSubmitTx, getWeb3WalletData } from './asdf';
	import type { ErgoBox } from 'ergo-lib-wasm-nodejs';
	import {
		buyUSDInputERGTx,
		buyUSDInputUSDTx,
		sellUSDInputERGTx,
		sellUSDInputUSDTx,
		buyRSVInputERGTx,
		buyRSVInputRSVTx,
		sellRSVInputERGTx,
		sellRSVInputRSVTx
	} from './sigmausd/sigmaUSD';
	import { calculateReserveRateAndBorders } from './sigmausd/sigmaUSDBankWidget';
	import {
		BASE_INPUT_AMOUNT_ERG,
		calculateInputsRSVErgInErg,
		calculateInputsUsdErgInErg,
		calculateInputsUsdErgInUsd,
		calculateInputsRSVErgInRSV
	} from './sigmausd/sigmaUSDInputRecalc';
	import { parseSigUsdBankBox, parseErgUsdOracleBox } from './sigmausd/sigmaUSDParser';
	import PrimaryButton from './PrimaryButton.svelte';

	/* ---------------------------------------
	 * Types & Constants
	 * ------------------------------------- */
	type Currency = {
		tokens: string[]; // e.g. ["ERG"], ["SigUSD"], ["SigRSV"]
		isToken?: boolean;
		isLpToken?: boolean;
		isLpPool?: boolean;
	};

	type LastUserInput = 'From' | 'To';

	// We define some helpers for clarity:
	const currencyERG: Currency = { tokens: ['ERG'], isToken: true };
	const currencySigUSD: Currency = { tokens: ['SigUSD'], isToken: true };
	const currencySigRSV: Currency = { tokens: ['SigRSV'], isToken: true };
	const currencyDexyGold: Currency = { tokens: ['DexyGold'], isToken: true };
	const currencyErgDexyGoldLpToken: Currency = { tokens: ['ERG', 'DexyGold'], isLpToken: true };
	const currencyErgDexyGoldLpPool: Currency = { tokens: ['ERG', 'DexyGold'], isLpPool: true };

	// All possible "from" currencies
	const fromCurrencies: Currency[] = [
		currencyERG,
		currencyDexyGold,
		currencySigUSD,
		currencySigRSV,
		// currencyErgDexyGoldLpToken,
		currencyErgDexyGoldLpPool
	];

	/* ---------------------------------------
	 * Local variables
	 * ------------------------------------- */
	let fromCurrency: Currency = currencyErgDexyGoldLpToken; // default to ERG: { tokens: ['ERG'] }
	let toCurrency: Currency = currencyErgDexyGoldLpPool; // default to SigRSV: { tokens: ['SigRSV'] }
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

	// Utility: Allowed "to" currencies depends on "fromCurrency"
	function getAllowedToCurrencies(fromC: Currency): Currency[] {
		if (fromC.tokens[0] === 'ERG' && fromC.isToken) {
			// If from == ERG, user can pick SigUSD or SigRSV
			return [currencySigUSD, currencySigRSV, currencyDexyGold];
		} else if (fromC.isLpPool) {
			// If from == ERG, user can pick SigUSD or SigRSV
			return [currencyErgDexyGoldLpToken];
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
		const { inErg, inSigUSD, inSigRSV, inCircSigUSD, inCircSigRSV } = parseSigUsdBankBox(bankBox);
		const { oraclePrice } = parseErgUsdOracleBox(oracleBox);
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

	function updateTitle() {
		console.log(fromCurrency.tokens[0], toCurrency.tokens[0]);
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
	 * Recalculation logic
	 * ------------------------------------- */
	// prettier-ignore
	function calculateAmountAndSwapPrice(lastInput:string, fromToken:string, toToken:string){
		if (lastInput === 'From' && fromToken === 'ERG' && toToken === 'SigUSD') {
			const { totalSigUSD, finalPrice } = calculateInputsUsdErgInErg(directionBuy, fromAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $oraclePriceSigUsd, $fee_mining);
			toAmount = totalSigUSD; swapPrice = finalPrice;
		}
		if (lastInput === 'From' && fromToken === 'ERG' && toToken === 'SigRSV') {
			const { totalSigRSV,finalPrice } = calculateInputsRSVErgInErg(directionBuy, fromAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $bankBoxInCircSigRsv, $oraclePriceSigUsd, $fee_mining);
			toAmount = totalSigRSV; swapPrice = finalPrice;
		}
		if (lastInput === 'From' && fromToken === 'SigUSD' && toToken === 'ERG') {
			const { totalErg,finalPrice } = calculateInputsUsdErgInUsd(directionSell, fromAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $oraclePriceSigUsd, $fee_mining);
			toAmount = totalErg; swapPrice = finalPrice;
		}
		if (lastInput === 'From' && fromToken === 'SigRSV' && toToken === 'ERG') {
			const { totalErg,finalPrice } = calculateInputsRSVErgInRSV(directionSell, fromAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $bankBoxInCircSigRsv, $oraclePriceSigUsd, $fee_mining);
			toAmount = totalErg; swapPrice = finalPrice;
		}
		if (lastInput === 'To' && fromToken === 'ERG' && toToken === 'SigUSD') {
			const { totalErg,finalPrice } = calculateInputsUsdErgInUsd(directionBuy, toAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $oraclePriceSigUsd, $fee_mining);
			fromAmount = totalErg; swapPrice = finalPrice;
		}
		if (lastInput === 'To' && fromToken === 'ERG' && toToken === 'SigRSV') {
			const { totalErg,finalPrice } = calculateInputsRSVErgInRSV(directionBuy, toAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $bankBoxInCircSigRsv, $oraclePriceSigUsd, $fee_mining);
			fromAmount = totalErg; swapPrice = finalPrice;
		}
		if (lastInput === 'To' && fromToken === 'SigUSD' && toToken === 'ERG') {
			const { totalSigUSD,finalPrice } = calculateInputsUsdErgInErg(directionSell, toAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $oraclePriceSigUsd, $fee_mining);
			fromAmount = totalSigUSD; swapPrice = finalPrice;
		}
		if (lastInput === 'To' && fromToken === 'SigRSV' && toToken === 'ERG') {
			const { totalSigRSV,finalPrice } = calculateInputsRSVErgInErg(directionSell, toAmount, $bankBoxInNanoErg, $bankBoxInCircSigUsdInCent, $bankBoxInCircSigRsv, $oraclePriceSigUsd, $fee_mining);
			fromAmount = totalSigRSV; swapPrice = finalPrice;
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

		// If both sides are empty, reset
		if (!fromAmount && !toAmount) {
			swapPrice = 0;
			return;
		}

		const fromToken = fromCurrency.tokens[0];
		const toToken = toCurrency.tokens[0];
		calculateAmountAndSwapPrice(lastInput, fromToken, toToken);
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
		const fromToken = fromCurrency.tokens[0];
		const toToken = toCurrency.tokens[0];

		const { me, utxos, height } = await getWeb3WalletData();

		let swapPairLastInput = `${fromToken}/${toToken}_${lastInput == 'From' ? fromToken : toToken}`;

		console.log({ swapPairLastInput, fromAmount });

		let amount;
		if (lastInput === 'From' && fromToken === 'ERG') 	amount = ergStringToNanoErgBigInt(fromAmount);
		if (lastInput === 'From' && fromToken === 'SigUSD') amount = usdStringToCentBigInt(fromAmount);
		if (lastInput === 'From' && fromToken === 'SigRSV') amount = BigInt(fromAmount);
		if (lastInput === 'To'	 && fromToken === 'ERG') 	amount = ergStringToNanoErgBigInt(toAmount);
		if (lastInput === 'To'	 && fromToken === 'SigUSD') amount = usdStringToCentBigInt(toAmount);
		if (lastInput === 'To'	 && fromToken === 'SigRSV') amount = BigInt(toAmount);

		let unsignedTx;

		switch (swapPairLastInput.toLocaleUpperCase()) {
			case 'ERG/SIGUSD_ERG':      unsignedTx = buyUSDInputERGTx (amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'ERG/SIGUSD_SIGUSD':   unsignedTx = buyUSDInputUSDTx (amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'SIGUSD/ERG_ERG':      unsignedTx = sellUSDInputERGTx(amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'SIGUSD/ERG_SIGUSD':   unsignedTx = sellUSDInputUSDTx(amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'ERG/SIGRSV_ERG':      unsignedTx = buyRSVInputERGTx (amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'ERG/SIGRSV_SIGRSV':   unsignedTx = buyRSVInputRSVTx (amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'SIGRSV/ERG_ERG':      unsignedTx = sellRSVInputERGTx(amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			case 'SIGRSV/ERG_SIGRSV':   unsignedTx = sellRSVInputRSVTx(amount!, me, SIGUSD_BANK_ADDRESS, utxos, height, $bank_box, $oracle_box, $fee_mining); break;
			default:
				throw new Error(`Unsupported swapPair and lastInput combination: ${swapPairLastInput}`);
		}
		console.log(unsignedTx);
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
</script>

<!-- UI Layout -->
<div class="widget relative">
	<div class="clipped mx-auto w-full max-w-md rounded-lg border border-gray-800 p-6">
		<!-- FROM SELECTION -->
		<div
			class="flex flex-col transition-all"
			class:justify-between={fromCurrency.isLpPool}
			style={fromCurrency.isLpToken || toCurrency.isLpToken
				? 'min-height:258px'
				: 'min-height:200px'}
		>
			<div>
				<div class="rounded-md bg-gray-800">
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
						class="relative flex flex-col rounded-lg bg-gray-800 focus-within:ring-1 focus-within:ring-blue-500"
						style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {!fromCurrency.isLpPool
							? '58px'
							: '116px'}; "
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
								style="width:280px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
								class="border-color flex w-full items-center justify-between rounded-lg bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
								on:click={() => {
									fromDropdownOpen = !fromDropdownOpen;
									toDropdownOpen = false;
								}}
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
								<div style="border-top-width:2px;" class="grow border-gray-800">
									<input
										type="number"
										class="w-full bg-transparent text-3xl text-gray-100 outline-none"
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
									style="width:187px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px; border-top-width:{fromCurrency.isLpPool
										? 2
										: 4}px; {fromCurrency.isLpPool ? ' border-top-left-radius:0' : ''}"
									class="flex w-full items-center justify-between rounded-lg border-gray-800 bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
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
										fill={toCurrency.isToken ? 'currentColor' : 'gray'}
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
									: '58'}px; margin-right:-4px"
								class="absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 border-gray-800 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
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
					</div>
				</div>

				<!-- DIRECTION -->
				<div class="relative" style="height:4px;">
					<div
						class="absolute"
						class:hidden={fromDropdownOpen}
						style="z-index:5;margin-top:-18px; left:170px"
					>
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
			<div class="rounded-md bg-gray-800">
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
					class="relative flex flex-col rounded-lg bg-gray-800 transition-all focus-within:ring-1 focus-within:ring-blue-500"
					style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {!toCurrency.isLpPool
						? '58px'
						: '116px'}; "
				>
					<div class="flex">
						<!-- TO AMOUNT -->
						<input
							type="number"
							class="w-full bg-transparent text-3xl text-gray-100 outline-none"
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
							style="width:280px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
							class="border-color flex w-full items-center justify-between rounded-lg bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
							on:click={() => {
								toDropdownOpen = !toDropdownOpen;
								fromDropdownOpen = false;
							}}
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
							<div style="border-top-width:2px;" class="grow border-gray-800">
								<input
									type="number"
									class="w-full bg-transparent text-3xl text-gray-100 outline-none"
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
								style="width:187px; margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px; border-top-width:{toCurrency.isLpPool
									? 2
									: 4}px; {toCurrency.isLpPool ? ' border-top-left-radius:0' : ''}"
								class="flex w-full items-center justify-between rounded-lg border-gray-800 bg-gray-800 px-3 py-2 font-medium text-gray-100 outline-none"
								on:click={() => {
									toDropdownOpen = !toDropdownOpen;
									fromDropdownOpen = false;
								}}
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

					<!-- Dropdown list -->
					{#if toDropdownOpen}
						<div
							id="toDropdownMenu"
							style="width: 408px; border-top-left-radius:0px; border-top-right-radius:0px;top:{toCurrency.isLpPool
								? '116'
								: '58'}px; margin-right:-4px"
							class="absolute right-0 z-30 w-28 origin-top-right rounded-md border-4 border-gray-800 bg-gray-800 shadow-md ring-1 ring-black ring-opacity-5"
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

<style>
	.clipped {
		position: relative;
		border-width: 1.5px;

		clip-path: polygon(
			0% 0%,
			/* top-left */ 100% 0%,
			/* top-right */ 100% 100%,
			/* bottom-right */ 7.5% 100%,
			/* move inward along bottom edge */ 0% 90% /* diagonal back up to left edge */
		);

		overflow: hidden;
	}

	.clipped::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;

		width: 100px;
		height: 100px;

		background: #1f2937;
		translate: -54% 84%;

		transform-origin: center;
		transform: rotate(45deg);
	}

	.border-color {
		border-color: #16151f;
	}
	.widget::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 600px;
		height: 600px;
		background-image: url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81.999435 81.999962"><path  fill="%231F2937" d="m 41.000218,0 c -0.422,0 -0.84,0.083 -1.23,0.244 l -26.718,11.07 c -0.786844,0.32548 -1.412067,0.950343 -1.738,1.737 L 0.24421771,39.771 c -0.32562361,0.786634 -0.32562361,1.670366 0,2.457 L 11.314218,68.947 c 0.325372,0.787031 0.950782,1.412081 1.738,1.737 l 26.719,11.07 c 0.786171,0.327945 1.670829,0.327945 2.457,0 l 26.72,-11.07 c 0.786529,-0.325606 1.411394,-0.950471 1.737,-1.737 l 11.07,-26.72 c 0.325624,-0.786634 0.325624,-1.670366 0,-2.457 l -11.07,-26.719 c -0.326491,-0.786283 -0.951529,-1.410962 -1.738,-1.737 l -26.719,-11.07 c -0.389,-0.161 -0.806,-0.244 -1.228,-0.244 Z"/></svg>');
		opacity: 0;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
		z-index: 0; /* Place behind the content */
	}
</style>
