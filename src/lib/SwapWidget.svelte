<script lang="ts">
	import {
		ErgoAddress,
		OutputBuilder,
		RECOMMENDED_MIN_FEE_VALUE,
		SAFE_MIN_BOX_VALUE,
		SLong,
		TransactionBuilder
	} from '@fleet-sdk/core';
	import BigNumber from 'bignumber.js';
	import {
		calculateSigUsdRateWithFee,
		calculateSigUsdRateWithFeeFromErg,
		calculateSigUsdRateWithFeeReversed,
		extractBoxesData,
		SIGUSD_BANK,
		TOKEN_BANK_NFT,
		TOKEN_SIGRSV,
		TOKEN_SIGUSD
	} from './sigmaUSD';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	// TODO: Technical Minimal Values -> 0.11
	// TODO: Swap Button -> Create TX
	// Recalculate TX
	// + usd Global FEE_MINING

	// TODO: Loader Status

	onMount(async () => {
		await updateBankBoxAndOracle();
		initialInputs();
		loading = false;
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

	let loading = true;

	let fromAmount = '';
	let feeMining = FEE_MINING_MIN;
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

	async function handleSwapButton(event: Event) {
		// Check currency -> Trigger TX
		if (selectedCurrency == 'ERG') {
			const cents = BigInt(BigNumber(toAmount).multipliedBy(100).toString());
			await exchangeSC(1n, cents);
		} else {
			const cents = BigInt(BigNumber(fromAmount).multipliedBy(100).toString());
			await exchangeSC(-1n, cents);
		}

		await exchangeSC(1n, 100n);
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

		const miningFee = feeMining;
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
		const miningFee = feeMining;
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

	async function exchangeSC(direction: bigint = 1n, requestSC: bigint = 100n) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const tx = await exchangeScTx(requestSC, me, SIGUSD_BANK, utxos, height, direction);
		console.log(tx);
		const signed = await ergo.sign_tx(tx);
		//		const txId = await ergo.submit_tx(signed);
		console.log(signed);
		//		console.log(txId);
	}

	export async function exchangeScTx(
		requestSC: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);

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

		const { rateSCERG: rateWithFee, bcDeltaExpectedWithFee: reversedRequestErg } =
			calculateSigUsdRateWithFee(inErg, inCircSigUSD, oraclePrice, requestSC, direction);

		// Reversed_info_tester
		//reversedRequestErg
		const {
			rateSCERG: reversedrateWithFee,
			fee,
			requestSC: reversedRequestSC
		} = calculateSigUsdRateWithFeeReversed(
			inErg,
			inCircSigUSD,
			oraclePrice,
			reversedRequestErg,
			direction
		);
		console.log('---------------------------------------');
		console.log('initial SC=', requestSC, ' vs reversed=', reversedRequestSC);
		console.log('direct rate=', rateWithFee, ' vs reversed=', reversedrateWithFee);
		console.log('when ERG=', reversedRequestErg);

		console.log('---------------------------------------');

		const { requestErg, outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } =
			calculateOutputSc(
				inErg,
				inSigUSD,
				inSigRSV,
				inCircSigUSD,
				inCircSigRSV,
				requestSC,
				rateWithFee,
				direction
			);

		// ---------- Bank Box
		const BankOutBox = new OutputBuilder(outErg, bankAddr)
			.addTokens([
				{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
				{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
				{ tokenId: TOKEN_BANK_NFT, amount: 1n }
			])
			.setAdditionalRegisters({
				R4: SLong(BigInt(outCircSigUSD)).toHex(), //value
				R5: SLong(BigInt(outCircSigRSV)).toHex() //nano erg
			});

		// ---------- Receipt ------------
		console.log('direction=', direction, ' -1n?', direction == -1n);
		const receiptBox = new OutputBuilder(
			direction == -1n ? requestErg : SAFE_MIN_BOX_VALUE,
			myAddr
		).setAdditionalRegisters({
			R4: SLong(BigInt(direction * requestSC)).toHex(),
			R5: SLong(BigInt(direction * requestErg)).toHex()
		});

		if (direction == 1n) {
			receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: requestSC });
		}

		const unsignedMintTransaction = new TransactionBuilder(height)
			.from([bankBox, ...utxos])
			.to([BankOutBox, receiptBox])
			.sendChangeTo(myAddr)
			.payFee(RECOMMENDED_MIN_FEE_VALUE)
			.build()
			.toEIP12Object();

		unsignedMintTransaction.dataInputs = [oracleBox];

		return unsignedMintTransaction;
	}
	function calculateOutputSc(
		inErg: bigint,
		inSigUSD: bigint,
		inSigRSV: bigint,
		inCircSigUSD: bigint,
		inCircSigRSV: bigint,
		requestSC: bigint,
		rateWithFee: number,
		direction: bigint
	) {
		const requestErg = BigInt(Math.floor(Number(requestSC) / rateWithFee)); //nanoerg
		console.log('---------EXCHANGE----------');
		console.log('🚀 ~ requestErg:', requestErg, ' | nanoergs');
		console.log('🚀 ~ requestSC:', requestSC, ' | cents');
		console.log('                          ');

		// Bank out
		const outErg = inErg + requestErg * direction; //
		console.log('inErg:', inErg, ' + requestErg:', requestErg, ' = outErg:', outErg);

		const outSigUSD = inSigUSD - requestSC * direction; //
		console.log('inSigUSD:', inSigUSD, ' -requestSC:', requestSC, ' = outSigUSD:', outSigUSD);

		const outCircSigUSD = inCircSigUSD + requestSC * direction;
		console.log('🚀 ~ outCircSigUSD:', outCircSigUSD);

		const outSigRSV = inSigRSV;
		const outCircSigRSV = inCircSigRSV;

		return {
			requestErg,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		};
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
		on:click={handleSwapButton}
		class="w-full rounded-lg bg-orange-500 py-3 font-medium text-black text-white hover:bg-orange-600 hover:text-white dark:bg-orange-600 dark:hover:bg-orange-700"
	>
		Swap
	</button>
</div>
