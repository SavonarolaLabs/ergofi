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
	import { history } from '../data/history';

	// TODO: FIX - INPUT VISUAL SEPARATE FROM INPUT VALUE ... (0.01 cents due to round dissapears)

	onMount(async () => {
		await updateBankBoxAndOracle();
		initialInputs();
		loading = false;
		console.log(SAFE_MIN_BOX_VALUE);
		console.log(RECOMMENDED_MIN_FEE_VALUE);
	});

	const FEE_UI = 10n; //0.1%
	const FEE_UI_DENOM = 100_00n;
	const FEE_MINING_MIN = RECOMMENDED_MIN_FEE_VALUE;
	const BASE_INPUT_AMOUNT_ERG = 100n; //100 ERG
	const BASE_INPUT_AMOUNT_USD = 100_00n; //100 USD

	const uiFeeAddress = '9hBdmAbDAcqzL7ZnKjxo39pbEUR5VVzQA7LHWYywdGrZDmf6x5K';

	// LOAD ORACLE BOX
	// Фиктивные данные (замените на реальные данные из блокчейна)
	const directionBuy = 1n;
	const directionSell = -1n;

	const bankBoxInErg = writable<bigint>(1653105734759386n);
	const bankBoxInCircSigUsd = writable<bigint>(46260638n);
	const oraclePriceSigUsd = writable<bigint>(5405405n);

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

	function test() {
		// for example
		const tx = history.items[2];
		const bank = calculateAddressInfo(tx, SIGUSD_BANK);
		const userAddress = tx.outputs[1]?.address || tx.inputs[0]?.address;
		const user = calculateAddressInfo(tx, userAddress); // В банке стало больше ERG
		const minerAddress =
			'2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe';
		const miner = calculateAddressInfo(tx, minerAddress);
		const sigmaUIAddress = '9g8gaARC3N8j9v97wmnFkhDMxHHFh9PEzVUtL51FGSNwTbYEnnk';
		const sigmaUI = calculateAddressInfo(tx, sigmaUIAddress);

		const diffErg = nanoErgToErg(bank.difference);
		console.log({ bank }, { user });

		const contractErg = bank.ergoStats.difference;
		const inputErg = -user.ergoStats.difference;
		const totalFee = inputErg - contractErg;
		// console.log('UI Fee', { sigmaUI });
		// console.log('minerFee', { miner });
		const sigmaAndMinerErg = miner.ergoStats.difference + sigmaUI.ergoStats.difference;
		//console.log('is FEE ok?', totalFee == sigmaAndMinerErg ? 'yes' : 'no');
		const feeToContractErg = (100 * sigmaUI.ergoStats.difference) / contractErg;
		const feeToUserErg = (100 * sigmaUI.ergoStats.difference) / inputErg;
		console.log('feeToContractErg', feeToContractErg);
		console.log('feeToUserErg', feeToUserErg);
	}

	function calculateAddressInfo(tx: any, address: string): any {
		return {
			address: address,
			ergoStats: calculateErgoStatsByAddress(tx, address),
			usdStats: calculateTokenStatsByAddress(tx, TOKEN_SIGUSD, address),
			rsvStats: calculateTokenStatsByAddress(tx, TOKEN_SIGRSV, address)
		};
	}
	function calculateErgoStatsByAddress(tx: any, address: string): any {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == address)
			.flatMap((input: any) => input.value)
			.reduce((sum: number, value: any) => sum + value, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.address == address)
			.flatMap((output: any) => output.value)
			.reduce((sum: number, value: any) => sum + value, 0);

		return {
			input: inputAmount,
			output: outputAmount,
			difference: outputAmount - inputAmount
		};
	}
	function calculateTokenStatsByAddress(tx: any, tokenId: string, address: string): any {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == address)
			.flatMap((input: any) => input.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.address == address)
			.flatMap((output: any) => output.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		return {
			input: inputAmount,
			output: outputAmount,
			difference: outputAmount - inputAmount
		};
	}
	function nanoErgToErg(nanoErg: number) {
		return nanoErg ? Number((nanoErg / 10 ** 9).toFixed(2)) : 0;
	}

	function ergToNanoErg(erg: number) {
		return erg ? erg * 10 ** 9 : 0;
	}

	function centsToUsd(cents: number) {
		return cents ? Number((cents / 10 ** 2).toFixed(2)) : 0;
	}

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
		// TODO: Recalculate based on lastInput
		if (fromAmount !== '') {
			if (selectedCurrency == 'ERG') {
				const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } =
					calculateInputsUsdErgFromAmount(directionBuy, fromAmount);
				toAmount = totalSigUSD;
				globalUiFeeErg = uiFeeErg;
				globalContractERG = contractERG;
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
		// TODO: change based on lastInput
		if (lastInput == 'From') {
			if (selectedCurrency == 'ERG') {
				const nanoErg = BigInt(BigNumber(fromAmount).multipliedBy(1_000_000_000).toString());
				await buyUSDWithERG(nanoErg);
			} else {
				const cents = BigInt(BigNumber(fromAmount).multipliedBy(100).toString());
				await buyERGWithUSD(cents);
			}
		} else {
			if (selectedCurrency == 'ERG') {
				console.log('REVERSED CHECK');
				const cents = BigInt(BigNumber(toAmount).multipliedBy(100).toString());
				await buyUSDWithERGReversed(cents);
			} else {
				console.log('REVERSED CHECK USD');
				const nanoErg = BigInt(BigNumber(toAmount).multipliedBy(1_000_000_000).toString());
				console.log('NO FUNCTION, ERG to = ,', nanoErg);
				//await buyERGWithUSD(cents); //<-------- NO FUNCTION
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
			const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } =
				calculateInputsUsdErgFromAmount(directionSell, toAmount);
			fromAmount = totalSigUSD;
			globalUiFeeErg = uiFeeErg;
			globalContractERG = contractERG;
			swapPrice = finalPrice;
		}
		lastInput = 'To';
	}

	function handleFromAmountChange(event) {
		fromAmount = event.target.value;
		if (selectedCurrency == 'ERG') {
			const { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg } =
				calculateInputsUsdErgFromAmount(directionBuy, fromAmount);
			toAmount = totalSigUSD;
			globalUiFeeErg = uiFeeErg;
			globalContractERG = contractERG;
			swapPrice = finalPrice;
		} else {
			const { totalErg, finalPrice, totalFee } = calculateInputsUsdErgFromTotal(
				directionSell,
				fromAmount
			);
			toAmount = totalErg;
			swapPrice = finalPrice;
		}
		lastInput = 'From';
	}

	function calculatePriceUsdErgFromAmount(direction: bigint, buyAmount: BigNumber): any {
		const inputAmountNanoERG = buyAmount
			.multipliedBy('1000000000')
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

		// SAME STAFF
		// -- SAME AS BUILD TX CHECK

		// ----------------------------------------
		const uiFeeErg = (BigInt(inputAmountNanoERG) * FEE_UI) / FEE_UI_DENOM;
		const contractERG = BigInt(inputAmountNanoERG) - feeMining - uiFeeErg;
		// ----------------------------------------

		const {
			rateSCERG: contractRate,
			fee: contractFee,
			requestSC: contractUSD
		} = calculateSigUsdRateWithFeeReversed(
			$bankBoxInErg,
			$bankBoxInCircSigUsd,
			$oraclePriceSigUsd,
			contractERG,
			direction
		);

		const swapFee = contractFee + feeMining + uiFeeErg;
		const swapRate = new BigNumber(contractUSD.toString()).dividedBy(inputAmountNanoERG.toString());

		return {
			contractRate, // contractRate
			contractFee, //contractFee
			contractUSD, //contractUSD
			contractERG, //contractERG
			uiFeeErg, //
			swapFee, //totalFee
			swapRate //totalRate
		};
	}

	function calculateInputsUsdErgFromAmount(direction: bigint, buyAmountInput: any): any {
		const inputAmountERG = new BigNumber(buyAmountInput);
		if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
			const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
				calculatePriceUsdErgFromAmount(direction, inputAmountERG);

			const totalSigUSD = new BigNumber(contractUSD.toString()).dividedBy('100').toFixed(2);
			const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
			const totalFee = new BigNumber(swapFee.toString()).dividedBy('1000000000').toFixed(2);
			return { totalSigUSD, finalPrice, totalFee, contractERG, uiFeeErg };
		} else {
			const { contractRate, contractFee, contractUSD, contractERG, uiFeeErg, swapFee, swapRate } =
				calculatePriceUsdErgFromAmount(direction, new BigNumber(BASE_INPUT_AMOUNT_ERG.toString()));
			const totalSigUSD = '';
			const finalPrice = new BigNumber(10000000).multipliedBy(swapRate).toFixed(2);
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

		const totalErgoRequired = contractErgoRequired - feeUI - miningFee;
		const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());
		return { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal };
	}

	function calculateInputsUsdErgFromTotal(direction: bigint, buyTotalInput: any): any {
		const totalSigUSD = new BigNumber(buyTotalInput)
			.multipliedBy('100')
			.integerValue(BigNumber.ROUND_CEIL);

		if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
			// NEED TO REWORK THIS PART--------
			const { rateSCERG, feeContract, totalErgoRequired, feeTotal, rateTotal } =
				calculatePriceUsdErgFromTotal(direction, totalSigUSD);
			//---------------------------------
			const totalErg = new BigNumber(totalErgoRequired.toString())
				.dividedBy('1000000000')
				.toFixed(9);
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

	// BUY USD -> SELL ERG
	async function buyUSDWithERG(inputErg: bigint = 1_000_000_000n) {
		const direction = 1n;
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const tx = await buyUSDWithERGTx(inputErg, me, SIGUSD_BANK, utxos, height, direction);
		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		//		const txId = await ergo.submit_tx(signed);
		console.log(signed);
		//		console.log(txId);
	}

	export async function buyUSDWithERGTx(
		inputErg: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint
	): any {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
		const uiAddr = ErgoAddress.fromBase58(uiFeeAddress);

		// ----------------------------------------
		const uiSwapFee = (inputErg * FEE_UI) / FEE_UI_DENOM;
		const contractErg = inputErg - feeMining - uiSwapFee;
		// ----------------------------------------

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

		const { rateSCERG: contractRate, requestSC: contractUSD } = calculateSigUsdRateWithFeeReversed(
			inErg,
			inCircSigUSD,
			oraclePrice,
			contractErg,
			direction
		);

		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputScV2(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractErg,
			direction
		);
		console.log(contractUSD, 'USD -> ERG ', contractErg);

		// ---------- Bank Box
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
		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	function calculateOutputScV2(
		inErg: bigint,
		inSigUSD: bigint,
		inSigRSV: bigint,
		inCircSigUSD: bigint,
		inCircSigRSV: bigint,
		requestSC: bigint,
		requestErg: bigint,
		direction: bigint
	) {
		const outErg = inErg + requestErg * direction;
		const outSigUSD = inSigUSD - requestSC * direction;
		const outCircSigUSD = inCircSigUSD + requestSC * direction;
		const outSigRSV = inSigRSV;
		const outCircSigRSV = inCircSigRSV;

		return {
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		};
	}
	// BUY USD --> SELL ERG (From Finall USD AMOUNT)
	async function buyUSDWithERGReversed(inputUSD: bigint = 1_00n) {
		const direction = 1n;
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const tx = await buyERGWithUSDTx(inputUSD, me, SIGUSD_BANK, utxos, height, direction);
		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		//		const txId = await ergo.submit_tx(signed);
		console.log(signed);
		//		console.log(txId);
	}

	// SELL USD -> BUY ERG
	async function buyERGWithUSD(inputUSD: bigint = 1_00n) {
		const direction = -1n;
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const tx = await buyERGWithUSDTx(inputUSD, me, SIGUSD_BANK, utxos, height, direction);
		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		//		const txId = await ergo.submit_tx(signed);
		console.log(signed);
	}

	export async function buyERGWithUSDTx(
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

		const { rateSCERG: contractRate, bcDeltaExpectedWithFee: contractERG } =
			calculateSigUsdRateWithFee(inErg, inCircSigUSD, oraclePrice, contractUSD, direction);

		const { outErg, outSigUSD, outSigRSV, outCircSigUSD, outCircSigRSV } = calculateOutputScV2(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractERG,
			direction
		);

		// FEE AFTER SWAP = Backwards
		// ----------------------------------------
		const uiSwapFee = (contractERG * FEE_UI) / FEE_UI_DENOM;
		const userERG = contractERG - uiSwapFee - feeMining;
		// ----------------------------------------

		console.log(contractUSD, 'USD -> ERG ', userERG);

		// ---------- Bank Box
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
			direction == -1n ? contractERG : SAFE_MIN_BOX_VALUE,
			myAddr
		).setAdditionalRegisters({
			R4: SLong(BigInt(direction * contractUSD)).toHex(),
			R5: SLong(BigInt(direction * contractERG)).toHex()
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
		console.log(unsignedMintTransaction);
		return unsignedMintTransaction;
	}

	async function swapUSDERG(
		direction: bigint = 1n,
		swapUSD: bigint = 100n,
		feeUI: bigint = SAFE_MIN_BOX_VALUE
		//contractErg: bigint = 1n
	) {
		await window.ergoConnector.nautilus.connect();
		const me = await ergo.get_change_address();
		const utxos = await ergo.get_utxos();
		const height = await ergo.get_current_height();

		const tx = await swapUSDERGTx(swapUSD, me, SIGUSD_BANK, utxos, height, direction, feeUI);
		console.log(tx);
		const signed = await ergo.sign_tx(tx);

		//		const txId = await ergo.submit_tx(signed);
		console.log(signed);
		//		console.log(txId);
	}
	export async function swapUSDERGTx(
		contractUSD: bigint,
		holderBase58PK: string,
		bankBase58PK: string,
		utxos: Array<any>,
		height: number,
		direction: bigint,
		feeUI: bigint
	): any {
		const myAddr = ErgoAddress.fromBase58(holderBase58PK);
		const bankAddr = ErgoAddress.fromBase58(bankBase58PK);
		const uiAddr = ErgoAddress.fromBase58(uiFeeAddress);

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

		const { rateSCERG: contractRate, bcDeltaExpectedWithFee } = calculateSigUsdRateWithFee(
			inErg,
			inCircSigUSD,
			oraclePrice,
			contractUSD,
			direction
		); //Зачем тут нужен bcDeltaExpectedWithFee

		const {
			requestErg: contractErg,
			outErg,
			outSigUSD,
			outSigRSV,
			outCircSigUSD,
			outCircSigRSV
		} = calculateOutputSc(
			inErg,
			inSigUSD,
			inSigRSV,
			inCircSigUSD,
			inCircSigRSV,
			contractUSD,
			contractRate,
			direction
		); // Calculate Bank Box

		console.log('SECOND CALCULATION - TX');
		console.log(contractUSD, 'USD -> ERG ', contractErg);
		console.log('UI+MINING+ERG -> ', contractErg + feeUI + feeMining);

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
			direction == -1n ? contractErg : SAFE_MIN_BOX_VALUE,
			myAddr
		).setAdditionalRegisters({
			R4: SLong(BigInt(direction * contractUSD)).toHex(),
			R5: SLong(BigInt(direction * contractErg)).toHex()
		});

		if (direction == 1n) {
			receiptBox.addTokens({ tokenId: TOKEN_SIGUSD, amount: contractUSD });
		}

		// ---------- UI Fee Box ------------ (TODO: direction check)
		const uiFeeBox = new OutputBuilder(feeUI, uiAddr);

		const unsignedMintTransaction = new TransactionBuilder(height)
			.from([bankBox, ...utxos])
			.to([BankOutBox, receiptBox, uiFeeBox])
			.sendChangeTo(myAddr)
			.payFee(RECOMMENDED_MIN_FEE_VALUE)
			.build()
			.toEIP12Object();

		unsignedMintTransaction.dataInputs = [oracleBox];
		console.log(unsignedMintTransaction);

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
				class="broder relative flex w-72 items-center gap-2 rounded-lg bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
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
