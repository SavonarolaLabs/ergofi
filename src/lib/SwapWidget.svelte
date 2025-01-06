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
		calculateOutputSc,
		calculateBankRateUSDInputUSD,
		calculateBankRateUSDInputERG,
		extractBoxesData,
		FEE_UI,
		FEE_UI_DENOM,
		type OracleBoxesData
	} from './sigmaUSD';
	import {
		getBankBox,
		getOracleBox,
		SIGUSD_BANK_ADDRESS,
		TOKEN_BANK_NFT,
		TOKEN_SIGRSV,
		TOKEN_SIGUSD,
		type Output
	} from '$lib/api/ergoNode';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { history } from '../data/history';
	import {
		centsToUsd,
		ergStringToNanoErgBigInt,
		nanoErgToErg,
		oracleRateToUsd,
		usdStringToCentBigInt
	} from './utils';
	import {
		bankBoxInCircSigUsd,
		bankBoxInErg,
		oraclePriceSigUsd,
		reserve_boarder_left_ERG,
		reserve_boarder_left_USD,
		reserve_boarder_right_ERG,
		reserve_boarder_right_USD,
		reserve_rate
	} from './stores/bank';
	import { web3wallet_confirmedTokens } from './stores/web3wallet';
	import { ERGO_TOKEN_ID, SigUSD_TOKEN_ID } from './stores/ergoTokens';
	import {
		addPreparedInteraction,
		addSignedInteraction,
		cancelPreparedInteractionById
	} from './stores/preparedInteractions';

	onMount(async () => {
		await updateBankBoxAndOracle();
		initialInputs();
		loading = false;
		console.log(SAFE_MIN_BOX_VALUE);
		console.log(RECOMMENDED_MIN_FEE_VALUE);
		oraclePriceSigUsd.subscribe((val) => {
			window.document.title = `↑${oracleRateToUsd(val)} ↓${oracleRateToUsd(val)} | SigUSD`;
		});
	});

	const FEE_MINING_MIN = RECOMMENDED_MIN_FEE_VALUE;
	const BASE_INPUT_AMOUNT_ERG = 1n; //100 ERG
	const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD

	const uiFeeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

	const directionBuy = 1n;
	const directionSell = -1n;

	// TODO: type definition for OracleBox
	const oracle_box = writable<Output>();
	const bank_box = writable<Output>();

	type Currency = 'ERG' | 'SigUSD';
	type LastUserInput = 'From' | 'To';

	let loading = true;
	let fromAmount = '';
	let feeMining = FEE_MINING_MIN;
	let toAmount = '';
	let selectedCurrency: Currency = 'ERG';
	let swapPrice: number = 0.0;
	let globalUiFeeErg;
	let globalContractERG;
	let lastInput: LastUserInput = 'From';

	const currencies: Currency[] = ['ERG', 'SigUSD'];

	// Reserve Rate
	function calculateReserveRateAndBorders(
		inErg: bigint,
		inCircSigUSD: bigint,
		oraclePrice: bigint
	): any {
		console.log(inErg, 'inErg');
		console.log(oraclePrice, 'oraclePrice');

		const oraclePriceErgCents = BigNumber(10 ** 9).dividedBy(oraclePrice.toString());
		const reserveRateOld = Number(
			BigNumber(inErg.toString()) // nanoergi
				.multipliedBy(oraclePriceErgCents)
				.dividedBy(inCircSigUSD.toString())
				.dividedBy(10 ** 9)
				.multipliedBy(100)
				.toFixed(0)
		);

		const leftBoarderValue = 400;
		let leftBoarderDelta;
		const rightBoarderValue = 800;
		let rightBoarderDelta;
		// Clear convert
		const bankERG = BigNumber(inErg.toString()).dividedBy(10 ** 9); //convert to ERG
		const bankUSD = BigNumber(inCircSigUSD.toString()).dividedBy(100); //convert to USD
		const price = BigNumber(10 ** 9)
			.dividedBy(BigNumber(oraclePrice.toString()))
			.dividedBy(100); //convert to ERG / USD price

		const reserveRate = Number(
			bankERG.multipliedBy(price).dividedBy(bankUSD).multipliedBy(100).toFixed(0)
		); // as function

		const leftBorder = 4;
		const rightBorder = 8;

		function calculateBoarder(
			boarder: number,
			bankUSD: BigNumber,
			bankERG: BigNumber,
			price: BigNumber
		) {
			const a_Left = BigNumber(bankERG).multipliedBy(price);
			const b_Left = BigNumber(bankUSD).multipliedBy(boarder);
			const delta_a_b_Left = a_Left.minus(b_Left);
			const boarderUSD = delta_a_b_Left.dividedBy(boarder - 1);
			return boarderUSD;
		}

		const leftUSD = Number(calculateBoarder(leftBorder, bankUSD, bankERG, price).toFixed(0));
		const rightUSD = Number(calculateBoarder(rightBorder, bankUSD, bankERG, price).toFixed(0));
		const leftERG = Number(BigNumber(leftUSD).dividedBy(price).toFixed(0));
		const rightERG = Number(BigNumber(rightUSD).dividedBy(price).toFixed(0));

		return { reserveRate, leftUSD, rightUSD, leftERG, rightERG };
	}

	//----------------------------------- FEE ----------------------------------------
	export function applyFee(inputERG: bigint) {
		const uiSwapFee = (inputERG * FEE_UI) / FEE_UI_DENOM;
		const contractERG = inputERG - feeMining - uiSwapFee;
		return { uiSwapFee, contractERG };
	}

	export function reverseFee(contractERG: bigint) {
		const uiSwapFee = (contractERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
		const inputERG = contractERG + feeMining + uiSwapFee;
		return { inputERG, uiSwapFee };
	}

	export function reverseFeeSell(contractERG: bigint) {
		const uiSwapFee = (contractERG * FEE_UI) / FEE_UI_DENOM;
		const userERG = contractERG - feeMining - uiSwapFee;
		return { userERG, uiSwapFee };
	}

	export function applyFeeSell(inputERG: bigint) {
		const uiSwapFee = (inputERG * FEE_UI) / (FEE_UI_DENOM - FEE_UI);
		const contractERG = inputERG + feeMining + uiSwapFee;
		return { uiSwapFee, contractERG };
	}
	//----------------------------------- Other ----------------------------------------

	function initialInputs() {
		const { totalSigUSD, finalPrice, totalFee } = calculateInputsErg(
			directionBuy,
			new BigNumber(BASE_INPUT_AMOUNT_ERG.toString())
		);
		fromAmount = BASE_INPUT_AMOUNT_ERG.toString();
		toAmount = totalSigUSD;
		swapPrice = finalPrice;
	}

	async function fetchLatestOracleAndBankBox() {
		oracle_box.set(await getOracleBox());
		bank_box.set(await getBankBox());
	}

	async function updateBankBoxAndOracle() {
		console.log('update start');
		await fetchLatestOracleAndBankBox();
		const {
			inErg,

			inCircSigUSD,
			oraclePrice
		} = await extractBoxesData($oracle_box, $bank_box);
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

	function recalculateInputsOnCurrencyChange() {
		// TODO: Recalculate based on lastInput
		if (fromAmount !== '') {
			if (selectedCurrency == 'ERG') {
				const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } = calculateInputsErg(
					directionBuy,
					fromAmount
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
		recalculateInputsOnCurrencyChange();
	}

	function handleFromAmountChange(event: Event) {
		fromAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			// (f1.price)
			const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } = calculateInputsErg(
				directionBuy,
				fromAmount
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
				toAmount
			);
			fromAmount = totalSigUSD;
			globalUiFeeErg = uiFeeErg;
			globalContractERG = contractERG;
			swapPrice = finalPrice;
		}
		lastInput = 'To';
	}

	function handleFeeChange(event: Event) {
		feeMining = BigInt(Number(event.target.value) * 10 ** 9);
		recalculateInputsOnCurrencyChange(); //TODO: To Amount Hadle
	}

	//----------------------------------- PRICE/SWAP ----------------------------------------
	// (f1.price && f4.price)
	export function calculateInputsErg(direction: bigint, buyAmountInput: any): any {
		const inputAmountERG = new BigNumber(buyAmountInput);
		if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
			const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
				calculateInputsErgPrice(direction, inputAmountERG);

			const totalSigUSD = new BigNumber(contractUSD.toString()).dividedBy('100').toFixed(2);
			const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
			const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
			return { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg };
		} else {
			const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
				calculateInputsErgPrice(direction, new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()));
			const totalSigUSD = '';
			const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
			const totalFee = '';
			return { totalSigUSD, finalPrice, totalFee };
		}
	}

	export function calculateInputsErgPrice(direction: bigint, buyAmount: BigNumber): any {
		const inputAmountNanoERG = buyAmount
			.multipliedBy('1000000000')
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);
		const inputErg = BigInt(inputAmountNanoERG);

		let uiFeeErg: bigint;
		let contractERG: bigint;

		if (direction === 1n) {
			//f1
			({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg));
		} else {
			//f4
			//({ uiSwapFee: uiFeeErg, contractERG } = applyFee(inputErg));
			({ uiSwapFee: uiFeeErg, contractERG } = applyFeeSell(inputErg));
		}

		//Part 2 - Calculate Price
		let {
			rateSCERG: contractRate,
			fee: contractFee,
			requestSC: contractUSD
		} = calculateBankRateUSDInputERG(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd,
			contractERG,
			direction
		);

		//console.log(direction, 'direction');
		if (direction == -1n) {
			contractUSD = contractUSD + 1n;
		}

		//---------------------------------
		//Part 2 - Calculate Price ()
		const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
			calculateBankRateUSDInputUSD(
				$bankBoxInErg,
				$bankBoxInCircSigUsd,
				$oraclePriceSigUsd,
				contractUSD,
				direction
			);

		// TODO: --------------------------------
		console.log('');
		console.log(inputAmountNanoERG, ' Input ERG');
		console.log(contractERG, ' Contract ERG');
		console.log(contractErgCompare, ' contractErgCompare');
		console.log(contractUSD, ' contractUSD');

		// --------------------------------
		if (direction == -1n) {
			console.log('sell');
			if (contractERG < contractErgCompare) {
				console.log('Adjust FEE SELL');
				//uiFeeErg = uiFeeErg - (-contractErgCompare + contractERG); // ITS NEGATIVE: GG
				uiFeeErg = uiFeeErg + (contractErgCompare - contractERG); // Right
			}
		}

		//
		console.log('TOTAL USER ERG:', contractErgCompare - uiFeeErg - feeMining);

		// // ------ TEST ------
		// if (direction == 1n) {
		// 	console.log('buy');
		// 	// < probably this way
		// 	if (contractERG > contractErgCompare) {
		// 		console.log('Adjust FEE BUY');
		// 		uiFeeErg = uiFeeErg + (-contractErgCompare + contractERG);
		// 	}
		// }

		//if (contractERG > contractErgCompare) uiFeeErg = uiFeeErg + (contractErgCompare - contractERG);

		//console.log(uiFeeErg, 'uiFeeErg');
		const swapFee = contractFee + feeMining + uiFeeErg;
		const swapRate = new BigNumber(contractUSD.toString()).dividedBy(inputAmountNanoERG.toString());

		return {
			contractRate,
			contractFee,
			contractUSD,
			contractERG,
			uiFeeErg,
			swapFee, //totalFee
			swapRate //totalRate
		};
	}

	// (f3.price && f2.price)
	export function calculateInputsUsd(direction: bigint, buyTotalInput: any): any {
		const totalSigUSD = new BigNumber(buyTotalInput)
			.multipliedBy('100')
			.integerValue(BigNumber.ROUND_CEIL);

		if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
			const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
				calculateInputsUsdPrice(direction, totalSigUSD);

			//---------------------------------
			const totalErg = new BigNumber(totalErgoRequired.toString())
				.dividedBy('1000000000')
				.toFixed(9);
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(2);
			return { totalErg, finalPrice, totalFee };
		} else {
			const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
				calculateInputsUsdPrice(direction, new BigNumber(BASE_INPUT_AMOUNT_USD.toString()));
			const totalErg = '';
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = '';
			return { totalErg, finalPrice, totalFee };
		}
	}

	export function calculateInputsUsdPrice(direction: bigint, buyTotal: BigNumber): any {
		const totalSC = BigInt(buyTotal.toString());

		let uiFeeErg: bigint;
		let totalErgoRequired: bigint;

		const {
			rateSCERG,
			fee: feeContract,
			bcDeltaExpectedWithFee: contractErgoRequired
		} = calculateBankRateUSDInputUSD(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd,
			totalSC,
			direction
		);
		if (direction === 1n) {
			//f2
			({ inputERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFee(contractErgoRequired));
		} else {
			//f3
			console.log('f3.price');
			console.log(contractErgoRequired, ' contract ERG');
			({ userERG: totalErgoRequired, uiSwapFee: uiFeeErg } = reverseFeeSell(contractErgoRequired));
		}
		const feeTotal = feeContract + feeMining + uiFeeErg;
		console.log(contractErgoRequired - feeMining - uiFeeErg, ' final ERG');

		console.log();
		console.log();

		const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());
		return { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal };
	}

	// (f1)
	async function buyUSDInputERG(inputErg: bigint = 1_000_000_000n) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const direction = 1n;
		const tx = await buyUSDInputERGTx(inputErg, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);
		const interactionId = addPreparedInteraction(tx);
		try {
			const signed = await ergo.sign_tx(tx);
			addSignedInteraction(signed, interactionId);
			console.log({ signed });

			const txId = await ergo.submit_tx(signed);
			console.log({ txId });
		} catch (e) {
			cancelPreparedInteractionById(interactionId);
		}
		//		console.log(txId);
	}

	export async function buyUSDInputERGTx(
		inputErg: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		//Part 0 - use Fee
		let uiSwapFee;

		const { uiSwapFee: abc, contractERG: contractErg } = applyFee(inputErg);
		uiSwapFee = abc;

		//Part 1 - Get Oracle
		await fetchLatestOracleAndBankBox();
		const {
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			bankBox,
			oracleBox
		}: OracleBoxesData = await extractBoxesData($oracle_box, $bank_box);

		//Part 2 - Calculate Price
		const { rateSCERG: contractRate, requestSC: contractUSD } = calculateBankRateUSDInputERG(
			inErg,
			inCircSigUSD,
			oraclePrice,
			contractErg,
			direction
		);

		//---- DEBUG Price Calculation ----
		//Part 2 - Calculate Price ()
		const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
			calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

		//Adjust fee
		if (contractErg > contractErgCompare)
			uiSwapFee = uiSwapFee + (-contractErgCompare + contractErg);
		// //DEBUG RESULT: Need to Fix:   ----------------------

		//Part 3 - Calculate BankBox
		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractErgCompare,
			direction
		);

		//Part 4 - Calculate TX
		const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
			direction,
			contractErgCompare,
			contractUSD,
			holderBase58PK,
			bankBase58PK,
			height,
			bankBox,
			oracleBox,
			uiSwapFee,
			utxos,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		);

		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	// (f2)
	async function buyUSDInputUSD(inputUSD: bigint = 1_00n) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const direction = 1n;
		const tx = await buyUSDInputUSDTx(inputUSD, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);

		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		const txId = await ergo.submit_tx(signed);
		console.log(signed);
		//		console.log(txId);
	}

	export async function buyUSDInputUSDTx(
		inputUSD: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
		const uiAddr = ErgoAddress.fromBase58(uiFeeAddress);

		const contractUSD = inputUSD;

		//Part 1 - Get Oracle
		await fetchLatestOracleAndBankBox();
		const {
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			bankBox,
			oracleBox
		}: OracleBoxesData = await extractBoxesData($oracle_box, $bank_box);

		//Part 2 - Calculate Price
		const { rateSCERG: contractRate, bcDeltaExpectedWithFee: contractErg } =
			calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

		//Part 3 - Calculate BankBox
		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractErg,
			direction
		);

		//Part 0 - use Fee Reversed
		const { inputERG, uiSwapFee } = reverseFee(contractErg);

		//Part 4 - Calculate TX
		const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
			direction,
			contractErg,
			contractUSD,
			holderBase58PK,
			bankBase58PK,
			height,
			bankBox,
			oracleBox,
			uiSwapFee,
			utxos,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		); //UserErg is not important?

		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	// (f3)
	async function sellUSDInputUSD(inputUSD: bigint = 1_00n) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const direction = -1n;
		const tx = await sellUSDInputUSDTx(inputUSD, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);

		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		const txId = await ergo.submit_tx(signed);
		console.log(signed);
	}

	export async function sellUSDInputUSDTx(
		inputUSD: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
		const uiAddr = ErgoAddress.fromBase58(uiFeeAddress);

		const contractUSD = inputUSD;

		//Part 1 - Get Oracle
		await fetchLatestOracleAndBankBox();
		const {
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			bankBox,
			oracleBox
		}: OracleBoxesData = await extractBoxesData($oracle_box, $bank_box);

		//Part 2 - Calculate Price
		const { rateSCERG: contractRate, bcDeltaExpectedWithFee: contractERG } =
			calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

		//Part 3 - Calculate BankBox
		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractERG,
			direction
		);

		// PART X
		const { userERG, uiSwapFee } = reverseFeeSell(contractERG);
		console.log(contractUSD, 'USD -> ERG ', userERG);

		// PART X - Build
		const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
			direction,
			contractERG,
			contractUSD,
			holderBase58PK,
			bankBase58PK,
			height,
			bankBox,
			oracleBox,
			uiSwapFee,
			utxos,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		);

		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	// (f4)
	async function sellUSDInputERG(inputErg: bigint = 1_000_000_000n) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const direction = -1n;
		const tx = await sellUSDInputERGTx(inputErg, me, SIGUSD_BANK_ADDRESS, utxos, height, direction);

		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		const txId = await ergo.submit_tx(signed);
		console.log(signed);
	}

	export async function sellUSDInputERGTx(
		inputErg: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		//Part 0 - use Fee
		let uiSwapFee;
		const { uiSwapFee: abc, contractERG: contractErg } = applyFeeSell(inputErg);
		uiSwapFee = abc;

		//Part 1 - Get Oracle
		await fetchLatestOracleAndBankBox();
		const {
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			oraclePrice,
			bankBox,
			oracleBox
		}: OracleBoxesData = await extractBoxesData($oracle_box, $bank_box);

		//Part 2.1 - Calculate Price
		let { rateSCERG: contractRate, requestSC: contractUSD } = calculateBankRateUSDInputERG(
			inErg,
			inCircSigUSD,
			oraclePrice,
			contractErg,
			direction
		);

		//Part 2.2 - Reversed round UP ()
		if (direction == -1n) {
			contractUSD = contractUSD + 1n;
		}

		const { rateSCERG: contractRateCompare, bcDeltaExpectedWithFee: contractErgCompare } =
			calculateBankRateUSDInputUSD(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

		if (contractErg < contractErgCompare) {
			uiSwapFee = uiSwapFee + (contractErgCompare - contractErg);
			console.log('real sell - fee adjusted');
		}

		//Part 3 - Calculate BankBox
		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractErgCompare,
			direction
		);

		//Part 4 - Calculate TX
		const unsignedMintTransaction = buildTx_SIGUSD_ERG_USD(
			direction,
			contractErgCompare,
			contractUSD,
			holderBase58PK,
			bankBase58PK,
			height,
			bankBox,
			oracleBox,
			uiSwapFee,
			utxos,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		);

		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	// TOOL:
	export function buildTx_SIGUSD_ERG_USD(
		direction: bigint,
		contractErg: bigint,
		contractUSD: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		height: number,
		bankBox: any,
		oracleBox: any,
		uiSwapFee: bigint,
		utxos: Array<any>,
		outErg: bigint,
		outSigUSD: bigint,
		outSigRSV: bigint,
		outCircSigUSD: bigint,
		outCircSigRSV: bigint
	) {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
		const uiAddr = ErgoAddress.fromBase58(uiFeeAddress);

		const BankOutBox = new OutputBuilder(outErg, bankAddr)
			.addTokens([
				{ tokenId: TOKEN_SIGUSD, amount: outSigUSD },
				{ tokenId: TOKEN_SIGRSV, amount: outSigRSV },
				{ tokenId: TOKEN_BANK_NFT, amount: 1n }
			])
			.setAdditionalRegisters({
				R4: SLong(BigInt(outCircSigUSD)).toHex(),
				R5: SLong(BigInt(outCircSigRSV)).toHex()
			});

		// ---------- Receipt ------------
		console.log('direction=', direction, ' -1n?', direction == -1n);
		const receiptBox = new OutputBuilder(
			direction == -1n ? contractErg : SAFE_MIN_BOX_VALUE,
			myAddr
		).setAdditionalRegisters({
			R4: SLong(BigInt(direction * contractUSD)).toHex(),
			R5: SLong(BigInt(direction * contractErg)).toHex()
		});

		if (direction == 1n) {
			receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: contractUSD });
		}

		const uiFeeBox = new OutputBuilder(uiSwapFee, uiAddr);

		const unsignedMintTransaction = new TransactionBuilder(height)
			.from([bankBox, ...utxos])
			.to([BankOutBox, receiptBox, uiFeeBox])
			.sendChangeTo(myAddr)
			.payFee(feeMining)
			.build()
			.toEIP12Object();

		unsignedMintTransaction.dataInputs = [oracleBox];

		return unsignedMintTransaction;
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
