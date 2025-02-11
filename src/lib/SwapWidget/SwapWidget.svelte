<script lang="ts">
	import {
		buildSwapDexyGoldTx,
		dexyGoldLpMintInputDexyPrice,
		dexyGoldLpMintInputErgPrice,
		dexyGoldLpMintInputSharesPrice,
		dexyGoldLpMintInputSharesTx,
		dexyGoldLpRedeemInputDexyPrice,
		dexyGoldLpRedeemInputErgPrice,
		dexyGoldLpRedeemInputSharesPrice,
		dexyGoldLpSwapInputDexyPrice,
		dexyGoldLpSwapInputErgPrice,
		dexyGoldLpSwapInputErgTx
	} from '$lib/dexygold/dexyGold';
	import {
		dexygold_lp_box,
		dexygold_lp_mint_box,
		dexygold_lp_redeem_box,
		dexygold_lp_swap_box,
		oracle_erg_xau_box
	} from '$lib/stores/dexyGoldStore';
	import { initJsonTestBoxes } from '$lib/stores/dexyGoldStoreJsonTestData';
	import { onMount } from 'svelte';
	import { DIRECTION_BUY, DIRECTION_SELL, SIGUSD_BANK_ADDRESS } from '../api/ergoNode';
	import { createInteractionAndSubmitTx, getWeb3WalletData } from '../asdf';
	import Gear from '../icons/Gear.svelte';
	import Tint from '../icons/Tint.svelte';
	import WalletBalance from '../icons/WalletBalance.svelte';
	import { getWalletInstallLink } from '../installWallet';
	import PrimaryButton from '../PrimaryButton.svelte';
	import { buildSwapSigmaUsdTx } from '../sigmausd/sigmaUSD';
	import { bank_box, fee_mining, oracle_box, reserve_border_left_USD } from '../stores/bank';
	import { ERGO_TOKEN_ID, SigRSV_TOKEN_ID, SigUSD_TOKEN_ID } from '../stores/ergoTokens';
	import { confirmed_interactions, mempool_interactions } from '../stores/preparedInteractions';
	import { selected_contract } from '../stores/ui';
	import {
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_wallet_used_addresses
	} from '../stores/web3wallet';
	import SubNumber from '../SubNumber.svelte';
	import {
		centsToUsd,
		ergStringToNanoErg,
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
	} from './currency';
	import Dropdown from './Dropdown.svelte';
	import SwapInputs from './SwapInputs.svelte';
	import type { Currency, LastUserInput } from './SwapWidget.types';
	import { recalcAmountAndPrice, recalcSigUsdBankAndOracleBoxes } from './swapWidgetProtocolSigUsd';

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

		loadFromToCurrencyFromLocalStorage();
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
	function doRecalc() {
		if ($selected_contract == 'SigmaUsd') {
			doRecalcSigUsdContract();
		} else if ($selected_contract == 'DexyGold') {
			doRecalcDexyGoldContract();
		}
	}
	function doRecalcSigUsdContract() {
		const recalc = recalcAmountAndPrice(fromCurrency, fromAmount, toCurrency, toAmount, lastInput);
		if (recalc) {
			swapPrice = recalc.price;
			if (recalc.from != undefined) {
				fromAmount = recalc.from;
			}
			if (recalc.to != undefined) {
				toAmount = recalc.to;
			}
		}
	}

	//prettier-ignore
	async function doRecalcDexyGoldContract() {
		// 4 from 10
		const params = {
			swapState: {
				lpSwapIn: $dexygold_lp_swap_box,
				lpIn: $dexygold_lp_box
			},
			mintState:{
				lpMintIn: $dexygold_lp_mint_box,
				lpIn: $dexygold_lp_box
			},
			redeemState:{
				lpRedeemIn: $dexygold_lp_redeem_box,
				lpIn: $dexygold_lp_box,
				goldOracle: $oracle_erg_xau_box
			}
		};





		if ( lastInput === 'From' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken
		) {
			const{ uiSwapFee, contractErg, contractDexy, sharesUnlocked, price } =dexyGoldLpMintInputErgPrice(
				ergStringToNanoErg(fromAmount),
				$fee_mining,
				params.mintState
			)
			fromAmount2 = contractDexy.toString();
			toAmount = sharesUnlocked.toString();
			swapPrice = price;

		}
		if ( lastInput === 'From2' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken
		) {
			const{ uiSwapFee, inputErg, contractDexy, contractErg, sharesUnlocked, price } =dexyGoldLpMintInputDexyPrice(
				BigInt(fromAmount2),
				$fee_mining,
				params.mintState
			)
			fromAmount = nanoErgToErg(inputErg);
			toAmount = sharesUnlocked.toString();
			swapPrice = price;
		}
		if ( lastInput === 'To' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken
		) {
			const{ uiSwapFee, inputErg, contractErg, contractDexy, sharesUnlocked, price }=dexyGoldLpMintInputSharesPrice(
				BigInt(toAmount),
				$fee_mining,
				params.mintState
			)
			fromAmount = nanoErgToErg(inputErg);
			fromAmount2 = contractDexy.toString();
			swapPrice = price;
		}
		if ( lastInput === 'From' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'
		) {
			const{ uiSwapFee, userErg, contractErg, contractDexy, price }=dexyGoldLpRedeemInputSharesPrice(
				BigInt(fromAmount),
				$fee_mining,
				params.redeemState
			)
			toAmount = nanoErgToErg(userErg);
			toAmount2 = contractDexy.toString();
			swapPrice = price;
		}
		if ( lastInput === 'To' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'
		) {
			const{ uiSwapFee, contractErg, contractDexy, sharesUnlocked, price }=dexyGoldLpRedeemInputErgPrice(
				ergStringToNanoErg(toAmount),
				$fee_mining,
				params.redeemState
			)
			fromAmount = sharesUnlocked.toString();
			toAmount2 = contractDexy.toString();
			swapPrice = price;
		}
		if ( lastInput === 'To2' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'
		) {
			const{ uiSwapFee, userErg, contractErg, sharesUnlocked, price }=dexyGoldLpRedeemInputDexyPrice(
				BigInt(toAmount2),
				$fee_mining,
				params.redeemState
			)
			fromAmount = sharesUnlocked.toString();
			toAmount = nanoErgToErg(userErg);
			swapPrice = price;
		}

		if ( lastInput === 'From' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold'
		) {
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputErgPrice(
				ergStringToNanoErg(fromAmount),
				DIRECTION_SELL,
				$fee_mining,
				params.swapState
			);
			toAmount = amountDexy.toString();
			swapPrice = price;
		}
		if ( lastInput === 'To' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG'
		) {
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputErgPrice(
				ergStringToNanoErg(toAmount),
				DIRECTION_BUY, //
				$fee_mining,
				params.swapState
			);
			fromAmount = amountDexy.toString();
			swapPrice = price;
		}
		if ( lastInput === 'From' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG'
		) {
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputDexyPrice(
				BigInt(fromAmount),
				DIRECTION_BUY,
				$fee_mining,
				params.swapState
			);
			toAmount = nanoErgToErg(amountErg);
			swapPrice = price;
		}
		if ( lastInput === 'To' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold'
		) {
			const { amountErg, amountDexy, price } = dexyGoldLpSwapInputDexyPrice(
				BigInt(toAmount),
				DIRECTION_SELL, //
				$fee_mining,
				params.swapState
			);
			//fromAmount = amountDexy.toString();
			fromAmount = nanoErgToErg(amountErg);
			swapPrice = price;
		}
	}

	async function doRecalcDexyGoldContract_TX() {
		console.log('doRecalcDexyGoldContract');
		//asdf
		const { me, utxos, height } = await getWeb3WalletData();
		const params = {
			inputErg: fromAmount,
			userBase58PK: me,
			height,
			feeMining: $fee_mining,
			utxos,
			swapState: {
				lpSwapIn: $dexygold_lp_swap_box,
				lpIn: $dexygold_lp_box
			}
		};

		const unsignedTx = dexyGoldLpSwapInputErgTx(
			ergStringToNanoErg(params.inputErg),
			DIRECTION_SELL,
			params.userBase58PK,
			params.height,
			params.feeMining,
			params.utxos,
			params.swapState
		);
		console.log({ unsignedTx });
	}

	/* ---------------------------------------
	 * Recalc Handlers
	 * ------------------------------------- */
	function handleFromAmountChange(event: Event) {
		fromAmount = (event.target as HTMLInputElement).value;
		lastInput = 'From';
		doRecalc();
	}

	function handleFromAmount2Change(event: Event) {
		fromAmount2 = (event.target as HTMLInputElement).value;
		lastInput = 'From2';
		doRecalc();
	}

	function handleToAmountChange(event: Event) {
		toAmount = (event.target as HTMLInputElement).value;
		lastInput = 'To';
		doRecalc();
	}

	function handleToAmount2Change(event: Event) {
		toAmount2 = (event.target as HTMLInputElement).value;
		lastInput = 'To2';
		doRecalc();
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
		// Check direction based on the last typed field
		let fromAmountX: bigint = 0n;
		let fromAmount2X: bigint = 0n;
		let toAmountX: bigint = 0n;
		let toAmount2X: bigint = 0n;
		let state 

		//if ( lastInput === 'From' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken)
		//if ( lastInput === 'From2' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken)
		//if ( lastInput === 'To' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken)
		//if ( lastInput === 'From' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold')
		//if ( lastInput === 'To' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold')
		//if ( lastInput === 'To2' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold')
		//if ( lastInput === 'From' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold')
		//if ( lastInput === 'To' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG')
		//if ( lastInput === 'From' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG')
		//if ( lastInput === 'To' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold')

		if ( lastInput === 'From' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken){
			fromAmountX = ergStringToNanoErg(fromAmount);
			state = { lpMintIn:$dexygold_lp_mint_box, lpIn:$dexygold_lp_box }
		}
		if ( lastInput === 'From2' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken){
			fromAmount2X = BigInt(fromAmount2);
			state = { lpMintIn:$dexygold_lp_mint_box, lpIn:$dexygold_lp_box }
		}
		if ( lastInput === 'To' 	&& fromCurrency.tokens[0] === 'ERG' && fromCurrency.tokens[1] === 'DexyGold' && toCurrency.isLpToken){
			toAmountX = BigInt(toAmount);
			state = { lpMintIn:$dexygold_lp_mint_box, lpIn:$dexygold_lp_box }
		}
		if ( lastInput === 'From' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'){
			fromAmountX = BigInt(fromAmount);
			state = { lpRedeemIn:$dexygold_lp_redeem_box, lpIn:$dexygold_lp_box, $goldOracle:oracle_erg_xau_box}
		}
		if ( lastInput === 'To' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'){
			toAmountX = BigInt(toAmount);
			state = { lpRedeemIn:$dexygold_lp_redeem_box, lpIn:$dexygold_lp_box, $goldOracle:oracle_erg_xau_box}
		}
		if ( lastInput === 'To2' 	&& fromCurrency.isLpToken && toCurrency.tokens[0] === 'ERG' && toCurrency.tokens[1] === 'DexyGold'){
			toAmount2X = BigInt(toAmount2);
			state = { lpRedeemIn:$dexygold_lp_redeem_box, lpIn:$dexygold_lp_box, $goldOracle:oracle_erg_xau_box}
		}
		
		if ( lastInput === 'From' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold'){
			fromAmountX = ergStringToNanoErg(fromAmount);
		}
		if ( lastInput === 'To' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG'){
			toAmountX = ergStringToNanoErg(toAmount);
		}
		if ( lastInput === 'From' && fromCurrency.tokens[0] === 'DexyGold' && toCurrency.tokens[0] === 'ERG'){
			fromAmountX = BigInt(fromAmount);
		}
		if ( lastInput === 'To' && fromCurrency.tokens[0] === 'ERG' && toCurrency.tokens[0] === 'DexyGold'){
			toAmountX = BigInt(toAmount);
		}
		const fromAssets = [{
			token: fromCurrency.tokens[0], // 'ERG' // 'DexyGold' // 'DexyLP'
			amount: fromAmountX
		},{
			token: fromCurrency.tokens[1],
			amount: fromAmount2X
		} ];
		const toAssets = [{
			token: toCurrency.tokens[0],
			amount: toAmountX
		},{
			token: toCurrency.tokens[1],
			amount: toAmount2X
		} ];
			
		const { me, utxos, height } = await getWeb3WalletData();

		const input = 1_000_000_000n
		const lpIn = ($dexygold_lp_box);
		const lpRedeemIn =($dexygold_lp_redeem_box);
		//lpRedeemIn: NodeBox;
	//lpIn: NodeBox;
	//goldOracle: NodeBox;

		const unsignedTx = buildSwapDexyGoldTx(input,me,height,$fee_mining,utxos,state)
			console.log({unsignedTx})
		
		await createInteractionAndSubmitTx(unsignedTx, [me]);

		
		// buildSwapSigmaUsdTx(
		// 	fromAssets,
		// 	toAssets,
		// 	lastInput,
		// 	me,
		// 	SIGUSD_BANK_ADDRESS,
		// 	utxos,
		// 	height,
		// 	$bank_box,
		// 	$oracle_box,
		// 	$fee_mining
		// );


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
		let fromAmountX: bigint = 0n;
		let toAmountX: bigint = 0n;
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'ERG')
			fromAmountX = ergStringToNanoErg(fromAmount);
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'SigUSD')
			fromAmountX = usdStringToCentBigInt(fromAmount);
		if (lastInput === 'From' && fromCurrency.tokens[0] === 'SigRSV')
			fromAmountX = BigInt(fromAmount);
		if (lastInput === 'To' && toCurrency.tokens[0] === 'ERG')
			toAmountX = ergStringToNanoErg(toAmount);
		if (lastInput === 'To' && toCurrency.tokens[0] === 'SigUSD')
			toAmountX = usdStringToCentBigInt(toAmount);
		if (lastInput === 'To' && toCurrency.tokens[0] === 'SigRSV') toAmountX = BigInt(toAmount);
		const fromAsset = {
			token: fromCurrency.tokens[0],
			amount: fromAmountX
		};
		const toAsset = {
			token: toCurrency.tokens[0],
			amount: toAmountX
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
		fromAmount = Number.parseFloat(fromBalance.replaceAll(',', '')).toString();
		doRecalc();
	}

	function handleSwapInputs() {
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
		const allowed = getAllowedToCurrencies(fromCurrency);
		toCurrency = allowed[0];
		selectContract();
		saveFromToCurrencyToLocalStorage();
		doRecalc();
	}
	function handleSelectToCurrency(c) {
		toCurrency = c;
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
<div class="widget relative" class:shake>
	<div
		class="clipped mx-auto w-full max-w-md rounded-xl rounded-br-none border border-[var(--widget-border-color)]"
		class:clip-long={fromCurrency.isLpPool || toCurrency.isLpPool}
		class:clip-short={!(fromCurrency.isLpPool || toCurrency.isLpPool)}
		style="padding:8px"
	>
		<div
			class="flex flex-col transition-all"
			class:justify-between={fromCurrency.isLpPool}
			style={fromCurrency.isLpToken || toCurrency.isLpToken
				? 'min-height:258px'
				: 'min-height:200px'}
		>
			<div>
				<!-- FROM SELECTION -->
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
				<SwapInputs on:swap={handleSwapInputs} />
			</div>

			<!-- TO SELECTION -->
			<div class="bg-gray-800">
				<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3 text-gray-400">
					<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabled}>
						{getLabelText()}</span
					>
					<span class="text-sm"
						>Price:
						<!-- If SigRSV is involved, show SubNumber(1 / swapPrice) as example -->

						{#if fromCurrency.isLpPool || toCurrency.isLpPool}
							<SubNumber value={swapPrice}></SubNumber>
						{:else if toCurrency.tokens[0] === 'SigRSV' || fromCurrency.tokens[0] === 'SigRSV'}
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
							disabled={getAllowedToCurrencies(fromCurrency).length < 2}
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
							{#if getAllowedToCurrencies(fromCurrency).length > 1}
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
								disabled={getAllowedToCurrencies(fromCurrency).length < 2}
							>
								<div class="flex items-center gap-3">
									<!-- Show the first token name, e.g. "ERG" -->
									<div class="h-5 w-5 {tokenColor(toCurrency.tokens[1])} rounded-full"></div>
									{toCurrency.tokens[1]}
								</div>
								{#if getAllowedToCurrencies(fromCurrency).length > 1}
									<svg
										class="pointer-events-none ml-2 h-6 w-6 text-gray-100"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={toCurrency.isToken ? 'currentColor' : 'gray'}
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
				<PrimaryButton
					onClick={handleSwapButton}
					text="Swap_"
					bgColor={$selected_contract == 'SigmaUsd' ? '#F87315' : '#ffea00'}
					subtext={$selected_contract}
				></PrimaryButton>
			</div>
		{/if}
	</div>
</div>

<!-- Dropdown list -->
{#if fromDropdownOpen}
	<Dropdown btnRect={fromBtnRect} currencies={fromCurrencies} onSelect={handleSelectFromCurrency} />
{/if}
{#if toDropdownOpen}
	<Dropdown
		btnRect={toBtnRect}
		currencies={getAllowedToCurrencies(fromCurrency)}
		onSelect={handleSelectToCurrency}
	/>
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

		border-bottom: 26px solid var(--widget-border-color);
		border-right: 26px solid transparent;
	}

	/* https://img.goodfon.ru/wallpaper/nbig/4/f0/gold-texture-golden-zoloto-fon-4060.webp */
</style>
