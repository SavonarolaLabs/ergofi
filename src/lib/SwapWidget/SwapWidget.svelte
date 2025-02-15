<script lang="ts">
	import { DEXY_GOLD } from '$lib/dexygold/dexyConstants';
	import {
		bestOptionErgToDexyGoldInputDexy,
		bestOptionErgToDexyGoldInputErg,
		buildSwapDexyGoldTx,
		dexyGoldLpMintInputDexyPrice,
		dexyGoldLpMintInputErgPrice,
		dexyGoldLpMintInputSharesPrice,
		dexyGoldLpRedeemInputDexyPrice,
		dexyGoldLpRedeemInputErgPrice,
		dexyGoldLpRedeemInputSharesPrice,
		dexyGoldLpSwapInputDexyPrice,
		dexyGoldLpSwapInputErgPrice,
		type DexyGoldUtxo
	} from '$lib/dexygold/dexyGold';
	import {
		dexygold_bank_arbitrage_mint_box,
		dexygold_bank_box,
		dexygold_bank_free_mint_box,
		dexygold_buyback_box,
		dexygold_lp_box,
		dexygold_lp_mint_box,
		dexygold_lp_redeem_box,
		dexygold_lp_swap_box,
		dexygold_tracking101_box,
		dexygold_widget_numbers,
		oracle_erg_xau_box,
		type DexyGoldNumbers
	} from '$lib/stores/dexyGoldStore';
	import { initJsonTestBoxes } from '$lib/stores/dexyGoldStoreJsonTestData';
	import { onMount } from 'svelte';
	import { DIRECTION_BUY, SIGUSD_BANK_ADDRESS } from '../api/ergoNode';
	import { createInteractionAndSubmitTx, getWeb3WalletData } from '../asdf';
	import Gear from '../icons/Gear.svelte';
	import Tint from '../icons/Tint.svelte';
	import { getWalletInstallLink } from '../installWallet';
	import PrimaryButton from '../PrimaryButton.svelte';
	import { buildSwapSigmaUsdTx } from '../sigmausd/sigmaUSD';
	import { bank_box, fee_mining, oracle_box, reserve_border_left_USD } from '../stores/bank';
	import {
		ERGO_TOKEN_ID,
		getTokenId,
		SigRSV_TOKEN_ID,
		SigUSD_TOKEN_ID
	} from '../stores/ergoTokens';
	import { confirmed_interactions, mempool_interactions } from '../stores/preparedInteractions';
	import { selected_contract } from '../stores/ui';
	import {
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_wallet_used_addresses
	} from '../stores/web3wallet';
	import SubNumber from '../SubNumber.svelte';
	import { centsToUsd, ergStringToNanoErg, isOwnTx, nanoErgToErg, valueToAmount } from '../utils';
	import {
		currencyErgDexyGoldLpPool,
		currencyErgDexyGoldLpToken,
		fromCurrencies,
		getAllowedToTokens,
		tokenColor
	} from './currency';
	import Dropdown from './Dropdown.svelte';
	import SwapInputs from './SwapInputs.svelte';
	import {
		anchor,
		getSwapTag,
		inputTokenIds,
		isLpTokenInput,
		isLpTokenOutput,
		setAmount,
		swapAmount,
		type SwapIntention,
		type SwapPreview,
		type SwapRow
	} from './swapIntention';
	import type { Currency, LastUserInput } from './SwapWidget.types';
	import { recalcAmountAndPrice, recalcSigUsdBankAndOracleBoxes } from './swapWidgetProtocolSigUsd';
	import { getFromLabel } from './swapWidgetUtils';
	import { filter } from 'lodash-es';

	/* ---------------------------------------
	 * Local variables
	 * ------------------------------------- */
	let swapIntent: SwapIntention = [
		{ side: 'input', tokenId: getTokenId('ERG')!, ticker: 'ERG' },
		{ side: 'input', tokenId: getTokenId('DexyGold')!, ticker: 'DexyGold' },
		{ side: 'output', tokenId: getTokenId('DexyGoldLP')!, ticker: 'DexyGoldLP' }
	];

	let fromCurrency: Currency = currencyErgDexyGoldLpToken;
	let toCurrency: Currency = currencyErgDexyGoldLpPool;
	let fromAmount = ['', ''];
	let toAmount = ['', ''];
	let swapPrice: number = 0.0;
	let lastInput: LastUserInput = 'From';

	let minerFee = 0.01;
	let showFeeSlider = false;

	let fromDropdownOpen = false;
	let toDropdownOpen = false;

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
			selectContract();
		} catch (e) {
			// Gotta catch 'em all.
		}
	}

	function selectContract() {
		if (
			(fromCurrency.isToken && ['SigUSD', 'SigRSV'].includes(fromCurrency.tokens[0])) ||
			(toCurrency.isToken && ['SigUSD', 'SigRSV'].includes(toCurrency.tokens[0]))
		) {
			selected_contract.set('SigmaUsd');
		} else {
			selected_contract.set('DexyGold');
		}
	}

	/* ---------------------------------------
	 * onMount: load / subscribe / etc.
	 * ------------------------------------- */
	onMount(() => {
		//TODO: remove
		initJsonTestBoxes();

		//loadFromToCurrencyFromLocalStorage();
		oracle_box.subscribe((oracleBox) => {
			recalcSigUsdBankAndOracleBoxes(oracleBox, $bank_box);
			if ($selected_contract == 'SigmaUsd') doRecalcSigUsdContract();
		});

		bank_box.subscribe((bankBox) => {
			recalcSigUsdBankAndOracleBoxes($oracle_box, bankBox);
			if ($selected_contract == 'SigmaUsd') doRecalcSigUsdContract();
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
		//return () => {
		//	window.removeEventListener('click', handleGlobalClick);
		//	window.removeEventListener('keydown', handleGlobalKeydown);
		//};
	});

	/* ---------------------------------------
	 * Recalculation logic
	 * ------------------------------------- */
	function doRecalc(inputRow?: SwapRow) {
		if ($selected_contract == 'SigmaUsd') {
			doRecalcSigUsdContract();
		} else if ($selected_contract == 'DexyGold') {
			swapIntent.forEach((row) => {
				if (row.tokenId == inputRow?.tokenId && row.side == inputRow?.side) {
					row.amount = inputRow.amount;
					row.value = inputRow.value;
					console.log('swapIntent.forEach((row) => {', inputRow.amount);
				}
			});

			let dexyGoldUtxo: DexyGoldUtxo = {
				lpSwapIn: $dexygold_lp_swap_box,
				lpMintIn: $dexygold_lp_mint_box,
				lpRedeemIn: $dexygold_lp_redeem_box,
				freeMintIn: $dexygold_bank_free_mint_box,
				bankIn: $dexygold_bank_box,
				buybankIn: $dexygold_buyback_box,
				arbMintIn: $dexygold_bank_arbitrage_mint_box,
				lpIn: $dexygold_lp_box,
				goldOracle: $oracle_erg_xau_box,
				tracking101: $dexygold_tracking101_box
			};

			const swapPreview = doRecalcDexyGoldContract(
				swapIntent,
				dexyGoldUtxo,
				$dexygold_widget_numbers,
				$fee_mining
			);
			swapIntent = swapPreview.calculatedIntent;
			swapPrice = swapPreview.price;
		}
	}
	function doRecalcSigUsdContract() {
		const recalc = recalcAmountAndPrice(
			fromCurrency,
			fromAmount[0],
			toCurrency,
			toAmount[0],
			lastInput
		);
		if (recalc) {
			swapPrice = recalc.price;
			if (recalc.from != undefined) {
				fromAmount[0] = recalc.from;
			}
			if (recalc.to != undefined) {
				toAmount[0] = recalc.to;
			}
		}
	}

	export function doRecalcDexyGoldContract(
		swapIntent: SwapIntention,
		dexyGoldUtxo: DexyGoldUtxo,
		dexyGoldNumbers: DexyGoldNumbers,
		feeMining: bigint
	): SwapPreview {
		console.log({ swapIntent });
		const swapTag = getSwapTag(swapIntent);
		const a = anchor(swapIntent);

		let calculatedIntent = structuredClone(swapIntent);
		let swapPreview: SwapPreview;
		if (swapTag == 'ERG+DEXYGOLD_ERG/DEXYGOLDLP') {
			const { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price } =
				dexyGoldLpMintInputErgPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);
			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
			setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
			swapPreview = { calculatedIntent, price };
		}

		if (swapTag == 'ERG+DEXYGOLD_DEXYGOLD/DEXYGOLDLP') {
			const { uiSwapFee, inputErg, contractDexy, contractErg, sharesUnlocked, price } =
				dexyGoldLpMintInputDexyPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);

			setAmount(calculatedIntent, ERGO_TOKEN_ID, contractErg);
			setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'ERG+DEXYGOLD_DEXYGOLDLP_DEXYGOLDLP') {
			const { uiSwapFee, inputErg, contractErg, contractDexy, sharesUnlocked, price } =
				dexyGoldLpMintInputSharesPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);

			setAmount(calculatedIntent, ERGO_TOKEN_ID, inputErg);
			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'DEXYGOLDLP_DEXYGOLDLP/ERG+DEXYGOLD') {
			const { uiSwapFee, userErg, contractErg, contractDexy, price } =
				dexyGoldLpRedeemInputSharesPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);

			setAmount(calculatedIntent, ERGO_TOKEN_ID, userErg);
			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}

		if (swapTag == 'DEXYGOLDLP/ERG+DEXYGOLD_ERG') {
			const { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price } =
				dexyGoldLpRedeemInputErgPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);

			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
			setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'DEXYGOLDLP/ERG+DEXYGOLD_DEXYGOLD') {
			const { uiSwapFee, userErg, contractErg, sharesUnlocked, price } =
				dexyGoldLpRedeemInputDexyPrice(swapAmount(swapIntent), feeMining, dexyGoldUtxo);
			setAmount(calculatedIntent, ERGO_TOKEN_ID, userErg);
			setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);

			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		//
		if (swapTag == 'ERG_ERG/DEXYGOLD') {
			const { bestAmount: contractDexy, bestPrice: price } = bestOptionErgToDexyGoldInputErg(
				swapAmount(swapIntent),
				dexyGoldUtxo,
				dexyGoldNumbers,
				feeMining
			);
			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'ERG/DEXYGOLD_DEXYGOLD') {
			const { bestAmount: inputErg, bestPrice: price } = bestOptionErgToDexyGoldInputDexy(
				swapAmount(swapIntent),
				dexyGoldUtxo,
				dexyGoldNumbers,
				feeMining
			);
			setAmount(calculatedIntent, ERGO_TOKEN_ID, inputErg);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'DEXYGOLD_DEXYGOLD/ERG') {
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputDexyPrice(
				swapAmount(swapIntent),
				DIRECTION_BUY,
				feeMining,
				dexyGoldUtxo
			);

			setAmount(calculatedIntent, ERGO_TOKEN_ID, amountErg);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}
		if (swapTag == 'DEXYGOLD/ERG_ERG') {
			console.log(getSwapTag(swapIntent));
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputErgPrice(
				swapAmount(swapIntent),
				DIRECTION_BUY, //
				feeMining,
				dexyGoldUtxo
			);
			setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, amountDexy);
			swapPreview = { calculatedIntent, price };
			console.log({ swapPreview });
		}

		return swapPreview;
	}

	/* ---------------------------------------
	 * Recalc Handlers
	 * ------------------------------------- */

	function handleFromAmountChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const side = input.dataset.side;
		const ticker = input.dataset.ticker;
		const tokenId = getTokenId(ticker)!;
		const value = input.value;
		const amount = valueToAmount({ tokenId, value });

		console.log({ side, ticker, tokenId, value, amount });
		fromAmount[0] = input.value;
		lastInput = 'From';
		doRecalc({ side, ticker, tokenId, value, amount });
	}

	let shake = false;

	/* prettier-ignore */
	async function handleSwapButton(){
	if ($selected_contract == 'SigmaUsd') {
		handleSwapButtonSigUsd();
		} else if ($selected_contract == 'DexyGold') {
		handleSwapButtonDexyGold();
		}
	}

	/* prettier-ignore */
	async function handleSwapButtonDexyGold() {
		if (isSwapDisabledCalc()) {
			setWidgetBorderError();
			shake = true;
			setTimeout(() => {
				shake = false;
				setWidgetBorderNormal();
			}, 300);
			return;
		}


		let dexyGoldUtxo = {
				lpSwapIn: $dexygold_lp_swap_box,
				lpMintIn: $dexygold_lp_mint_box,
				lpRedeemIn: $dexygold_lp_redeem_box,
				freeMintIn:$dexygold_bank_free_mint_box,
				bankIn: $dexygold_bank_box,
				buybankIn: $dexygold_buyback_box,
				arbMintIn:$dexygold_bank_arbitrage_mint_box,
				lpIn: $dexygold_lp_box,
				goldOracle: $oracle_erg_xau_box,
				tracking101: $dexygold_tracking101_box,
			}



		const { me, utxos, height } = await getWeb3WalletData();

		const input = 1_000_000_000n;

		const fromAssets =[]
		const toAssets =[]

		const unsignedTx = buildSwapDexyGoldTx(fromAssets,toAssets,input,me,height,$fee_mining,utxos,dexyGoldUtxo,$dexygold_widget_numbers)
		
		await createInteractionAndSubmitTx(unsignedTx, [me]);
	}

	async function handleSwapButtonSigUsd() {
		if (isSwapDisabledCalc()) {
			setWidgetBorderError();
			shake = true;
			setTimeout(() => {
				shake = false;
				setWidgetBorderNormal();
			}, 300);
			return;
		}
		// Check direction based on the last typed field

		const fromAsset = {
			token: fromCurrency.tokens[0],
			amount: fromAmount[0]
		};
		const toAsset = {
			token: toCurrency.tokens[0],
			amount: toAmount[0]
		};

		const { me, utxos, height } = await getWeb3WalletData();
		const unsignedTx = buildSwapSigmaUsdTx(
			fromAsset,
			toAsset,
			lastInput,
			me,
			SIGUSD_BANK_ADDRESS,
			utxos,
			height,
			$bank_box,
			$oracle_box,
			$fee_mining
		);

		await createInteractionAndSubmitTx(unsignedTx, [me]);
	}

	function handleFromBalanceClick() {
		fromAmount[0] = Number.parseFloat(fromBalance.replaceAll(',', '')).toString();
		doRecalc();
	}

	function handleSwapInputs() {
		const newSwapIntent: SwapIntention = structuredClone(swapIntent);
		swapIntent = newSwapIntent.map((row) => {
			row.side = row.side == 'input' ? 'output' : 'input';
			return row;
		});

		const temp = fromCurrency;
		fromCurrency = toCurrency;
		toCurrency = temp;
		selectContract();
		saveFromToCurrencyToLocalStorage();
		doRecalc();
	}

	/* ---------------------------------------
	 * Fee Change
	 * ------------------------------------- */

	const toggleFeeSlider = () => {
		showFeeSlider = !showFeeSlider;
	};

	function handleFeeChange(event: Event) {
		const val = (event.target as HTMLInputElement).value;
		fee_mining.set(BigInt(Number(val) * 10 ** 9));
		doRecalc();
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

	// move to own logic file, use stores if needed
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
	function handleSelectFromCurrency(c) {
		fromCurrency = c;
		fromDropdownOpen = false;
		const allowed = getAllowedToTokens(swapIntent);
		toCurrency = allowed[0];
		selectContract();
		saveFromToCurrencyToLocalStorage();
		doRecalc();
	}
	function handleSelectToCurrency(c) {
		toDropdownOpen = false;
		selectContract();
		saveFromToCurrencyToLocalStorage();
		doRecalc();
	}

	/* ---------------------------------------
	 * Validation ERRORS
	 * ------------------------------------- */

	const setCustomProperty = (property: string, value: string): void => {
		document.documentElement.style.setProperty(property, value);
	};

	function setWidgetBorderError() {
		setCustomProperty('--widget-border-color', 'red');
	}

	function setWidgetBorderNormal() {
		setCustomProperty('--widget-border-color', '#1F2937');
	}

	let isSwapDisabled = false;
	function getLabelText(): string {
		isSwapDisabled = isSwapDisabledCalc();
		if ($selected_contract == 'SigmaUsd' && !($reserve_border_left_USD > 0)) {
			if (fromCurrency.tokens[0] == 'ERG' && toCurrency.tokens[0] == 'SigUSD') {
				return 'Mint Unavailable';
			} else if (fromCurrency.tokens[0] == 'SigRSV' && toCurrency.tokens[0] == 'ERG') {
				return 'Redeem Unavailable';
			}
		}
		if (toCurrency.isLpPool || toCurrency.isLpToken) {
			return 'Get';
		} else {
			return 'To';
		}
	}

	function isSwapDisabledCalc() {
		if ($selected_contract == 'SigmaUsd' && !($reserve_border_left_USD > 0)) {
			if (fromCurrency.tokens[0] == 'ERG' && toCurrency.tokens[0] == 'SigUSD') {
				return true;
			} else if (fromCurrency.tokens[0] == 'SigRSV' && toCurrency.tokens[0] == 'ERG') {
				return true;
			}
		}
		return false;
	}
</script>

<!-- UI Layout -->
<div class="relative" class:shake>
	<div
		class="mx-auto w-full max-w-md rounded-xl rounded-bl-none rounded-br-none border-4 border-[var(--widget-border-color)]"
	>
		<div
			class="flex flex-col rounded-md rounded-bl-none rounded-br-none bg-[var(--widget-bg-color)] transition-all"
			class:justify-between={inputTokenIds(swapIntent).length > 1}
			style={swapIntent.length > 2 ? 'min-height:258px' : 'min-height:200px'}
		>
			<div>
				<!-- FROM SELECTION -->
				<div class="rounded-md rounded-bl-none">
					<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
						<span class="text-sm">{getFromLabel(swapIntent)}</span>
						<button
							class="hover: flex items-center gap-1 text-sm"
							on:click={handleFromBalanceClick}
						>
							{#if isLpTokenOutput(swapIntent)}
								<!-- <span><WalletBalance /></span> -->
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[0].ticker}</span
								>
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[1].ticker}</span
								>
							{:else if typeof fromBalance === 'number'}
								{fromBalance.toLocaleString('en-US', {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2
								})}
							{:else}
								<!-- <WalletBalance /> -->
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[0].ticker}</span
								>
							{/if}
						</button>
					</div>

					<div
						class="relative flex flex-col focus-within:ring-1 focus-within:ring-blue-500"
						style="border: none!important; outline: none!important; box-shadow: none!important; max-height: 
						{swapIntent.filter((i) => 'input' == i.side).length == 1 ? '58px' : '116px'}; "
					>
						<div class="flex" style="border-bottom:4px solid var(--widget-border-color);">
							<!-- FROM AMOUNT -->
							<input
								type="number"
								style=""
								class="w-[256px] bg-transparent text-3xl outline-none"
								placeholder="0"
								min="0"
								data-side="input"
								data-ticker={swapIntent.filter((i) => i.side == 'input')[0].ticker}
								bind:value={fromAmount[0]}
								on:input={handleFromAmountChange}
							/>

							<!-- FROM CURRENCY DROPDOWN -->
							<!-- Toggle button -->
							<button
								id="fromDropdownBtn"
								type="button"
								style="width:271px; border-right:none; margin-bottom:-4px; border-width:4px;  height:62px;"
								class="border-color flex w-full items-center justify-between rounded-lg rounded-bl-none rounded-br-none rounded-tr-none px-3 py-2 font-medium outline-none"
								on:click={toggleFromDropdown}
							>
								{#if isLpTokenInput(swapIntent)}
									<div class="flex items-center gap-3">
										<div class="text-lg text-blue-300"><Tint></Tint></div>
										<div class=" leading-0 flex w-full flex-col justify-center text-xs">
											<div>Liquidity</div>
											<div>Token</div>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3">
										<!-- Show the first token name, e.g. "ERG" -->
										<div
											class="h-5 w-5 {tokenColor(
												swapIntent.find((i) => 'input' == i.side)!.ticker
											)} rounded-full"
										></div>
										{swapIntent.filter((i) => 'input' == i.side)[0].ticker}
									</div>
								{/if}
								{#if swapIntent.filter((i) => 'input' == i.side).length == 1}
									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={'currentColor'}
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								{/if}
							</button>
						</div>

						<!-- LP second token START -->
						{#if swapIntent.filter((i) => i.side == 'input').length > 1}
							<div class="flex">
								<!-- FROM AMOUNT -->
								<div style="border-top-width:4px;" class="border-color w-[256px]">
									<input
										type="number"
										class="w-[256px] bg-transparent text-3xl outline-none"
										placeholder="0"
										min="0"
										bind:value={fromAmount[1]}
										data-side="input"
										data-ticker={swapIntent.filter((i) => i.side == 'input')[1].ticker}
										on:input={handleFromAmountChange}
									/>
								</div>

								<!-- FROM CURRENCY DROPDOWN -->
								<!-- Toggle button -->
								<button
									id="fromDropdownBtn2"
									type="button"
									style="border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;
									{fromCurrency.isLpPool || true ? ' border-top-left-radius:0' : ''}"
									class=" border-color flex items-center justify-between rounded-lg rounded-br-none px-3 py-2 font-medium outline-none"
									on:click={toggleFromDropdown}
								>
									<div class="flex items-center gap-3">
										<!-- Show the first token name, e.g. "ERG" -->
										<div
											class="h-5 w-5 {tokenColor(
												swapIntent.filter((i) => i.side == 'input')[1].ticker
											)} rounded-full"
										></div>
										{swapIntent.filter((i) => i.side == 'input')[1].ticker}
									</div>

									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={'currentColor'}
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
				<SwapInputs on:swap={handleSwapInputs} />
			</div>

			<!-- TO SELECTION -->
			<div class="">
				<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
					<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabled}>
						{getLabelText()}</span
					>
					<span class="text-sm">
						<!-- If SigRSV is involved, show SubNumber(1 / swapPrice) as example -->

						{#if toCurrency.tokens[0] === 'SigRSV' || fromCurrency.tokens[0] === 'SigRSV'}
							<SubNumber value={1 / swapPrice}></SubNumber>
						{:else if fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold'}
							1 {fromCurrency.tokens[0]} ≈ <SubNumber value={10 ** 9 / swapPrice}></SubNumber>
							{toCurrency.tokens[0]}
						{:else if fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG'}
							1 {fromCurrency.tokens[0]} ≈ <SubNumber value={swapPrice / 10 ** 9}></SubNumber>
							{toCurrency.tokens[0]}
						{:else}
							<SubNumber value={swapPrice}></SubNumber>
						{/if}
					</span>
				</div>

				<div
					class="relative flex flex-col rounded-lg rounded-bl-none focus-within:ring-1 focus-within:ring-blue-500"
					style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {swapIntent.filter(
						(i) => 'output' == i.side
					).length == 1
						? '58px'
						: '116px'}; "
				>
					<div class="flex" style="border-bottom:4px solid var(--widget-border-color);">
						<!-- TO AMOUNT -->
						<input
							type="number"
							class="w-[256px] bg-transparent text-3xl outline-none"
							placeholder="0"
							min="0"
							bind:value={toAmount[0]}
							data-side="output"
							data-ticker={swapIntent.filter((i) => i.side == 'output')[0].ticker}
							on:input={handleFromAmountChange}
						/>

						<!-- TO CURRENCY DROPDOWN -->
						<!-- Toggle button -->
						<button
							id="toDropdownBtn"
							type="button"
							style="width: 271px; border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
							class=" border-color flex w-full items-center justify-between rounded-lg rounded-br-none px-3 py-2 font-medium outline-none"
							disabled={getAllowedToTokens(swapIntent).length < 2}
							on:click={toggleToDropdown}
						>
							{#if isLpTokenOutput(swapIntent)}
								<div class="flex items-center gap-3">
									<div class="text-lg text-blue-300"><Tint></Tint></div>
									<div class=" leading-0 flex w-full flex-col justify-center text-xs">
										<div>Liquidity</div>
										<div>Token</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<!-- Show the first token name, e.g. "ERG" -->
									<div
										class="h-5 w-5 {tokenColor(
											swapIntent.filter((i) => i.side == 'output')[0].ticker
										)} rounded-full"
									></div>
									{swapIntent.filter((i) => i.side == 'output')[0].ticker}
								</div>
							{/if}
							{#if getAllowedToTokens(swapIntent).length > 1}
								<svg
									class="pointer-events-none ml-2 h-6 w-6"
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
					{#if swapIntent.filter((i) => i.side == 'output').length > 1}
						<div class="flex">
							<!-- FROM AMOUNT -->
							<div style="border-top-width:4px;" class="border-color w-[256px]">
								<input
									type="number"
									class="w-[256px] bg-transparent text-3xl outline-none"
									placeholder="0"
									min="0"
									bind:value={toAmount[1]}
									data-side="output"
									data-ticker={swapIntent.filter((i) => i.side == 'output')[1].ticker}
									on:input={handleFromAmountChange}
								/>
							</div>

							<!-- FROM CURRENCY DROPDOWN -->
							<!-- Toggle button -->
							<button
								id="toDropdownBtn2"
								type="button"
								style="width: 166px; border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-right-radius:0px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;
								{swapIntent.filter((i) => i.side == 'output').length > 1 ? ' border-top-left-radius:0' : ''}"
								class="border-color flex w-full items-center justify-between px-3 py-2 font-medium outline-none"
								on:click={toggleToDropdown}
								disabled={getAllowedToTokens(swapIntent).length < 2}
							>
								<div class="flex items-center gap-3">
									<!-- Show the first token name, e.g. "ERG" -->
									<div
										class="h-5 w-5 {tokenColor(
											swapIntent.filter((i) => i.side == 'output')[1].ticker
										)} rounded-full"
									></div>
									{swapIntent.filter((i) => i.side == 'output')[1].ticker}
								</div>
								{#if getAllowedToTokens(swapIntent).length > 1}
									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								{/if}
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
			<div class="mt-2 text-center text-sm">
				Miner Fee: {minerFee.toFixed(2)} ERG
			</div>
		</div>
		<!-- Swap Button -->
	</div>
	{#if $web3wallet_available_wallets.length == 0}
		<a
			target="_blank"
			href={getWalletInstallLink()}
			class="flex w-full justify-center rounded-lg bg-orange-600 py-3 font-medium hover:bg-orange-500"
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
			<PrimaryButton
				onClick={handleSwapButton}
				text="Swap_"
				bgColor={'#F87315'}
				subtext={$selected_contract}
			></PrimaryButton>
		</div>
	{/if}
</div>

<!-- Dropdown list -->
{#if fromDropdownOpen}
	<Dropdown btnRect={fromBtnRect} currencies={fromCurrencies} onSelect={handleSelectFromCurrency} />
{/if}
{#if toDropdownOpen}
	<Dropdown
		btnRect={toBtnRect}
		currencies={getAllowedToTokens(swapIntent)}
		onSelect={handleSelectToCurrency}
	/>
{/if}

<style>
</style>
