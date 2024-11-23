<script lang="ts">
	import BigNumber from 'bignumber.js';
	import {
		calculateSigUsdRateWithFee,
		calculateSigUsdRateWithFeeFromErg,
		calculateSigUsdRateWithFeeReversed,
		extractBoxesData
	} from './sigmaUSD';
	import { onMount } from 'svelte';
	import { RECOMMENDED_MIN_FEE_VALUE } from '@fleet-sdk/core';

	// LOAD ORACLE BOX
	// Фиктивные данные (замените на реальные данные из блокчейна)
	const inErg = BigInt('1603341601262771'); // Примерное значение ERG в системе
	const inCircSigUSD = BigInt('35223802'); // Циркулирующий SigUSD
	const oraclePrice = BigInt('6316597'); // Цена из оракула (nanoERG за цент)
	const directionBuy = -1n;
	const directionSell = 1n;
	const direction = directionBuy; // TEST

	//const FEE_UI = 10000n; //100% - TEST
	const FEE_UI = 50n; //0.5%
	const FEE_UI_DENOM = 100_00n;
	const FEE_MINING_MIN = RECOMMENDED_MIN_FEE_VALUE;

	// Dummy for tests
	// sigmaUSD.ts:825 initial SC= 100n  vs reversed= 100n
	// sigmaUSD.ts:826 direct rate= 1.6154397110743428e-7  vs reversed= 1.6154397110743428e-7
	// sigmaUSD.ts:827 when ERG= 619026506n

	// ----------RATES-----------
	// sigmaUSD.ts:65 🚀 ~ liableRate: 6316597n
	// sigmaUSD.ts:66 🚀 ~ oraclePrice: 6316597n
	// sigmaUSD.ts:67 🚀 ~ scNominalPrice: 6316597n

	// Импортируем функции (предполагается, что они доступны)
	// Если они находятся в другом файле, замените путь на корректный

	// Инициализация переменных
	let buyAmountInput = '10';
	let buyPriceInput = '';
	let buyTotalInput = '';
	let buyFeeInput = '';

	let sellAmountInput = '10';
	let sellPriceInput = '';
	let sellTotalInput = '';
	let sellFeeInput = '';

	// Обработчики изменений для покупки
	function handleBuyAmountChange(event) {
		buyAmountInput = event.target.value;
		calculateUsdErgFromAmount(direction);
	}

	let selectedCurrency: Currency = 'ERG';
	let fromAmount = '';
	let toAmount = '';
	// fromAmount

	function handleBuyTotalChange(event) {
		buyTotalInput = event.target.value;
		calculateUsdErgFromTotal(direction);
	}

	function calculateUsdErgFromAmount(direction: bigint, buyAmountInput: any): any {
		const inputAmountERG = new BigNumber(buyAmountInput);

		if (!inputAmountERG.isNaN() && inputAmountERG.gt(0)) {
			const inputAmountNanoERG = inputAmountERG
				.multipliedBy('1000000000')
				.integerValue(BigNumber.ROUND_FLOOR)
				.toFixed(0);

			const miningFee = FEE_MINING_MIN;
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
				inErg,
				inCircSigUSD,
				oraclePrice,
				BigInt(amountWithoutUI),
				direction
			);

			const rateTotal = new BigNumber(requestSC.toString()).dividedBy(
				inputAmountNanoERG.toString()
			);
			const feeTotal = feeContract + miningFee + feeUI;

			const totalSigUSD = new BigNumber(requestSC.toString()).dividedBy('100').toFixed(2);
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(9);
			return { totalSigUSD, finalPrice, totalFee };
		} else {
			const totalSigUSD = '';
			const finalPrice = '';
			const totalFee = '';
			return { totalSigUSD, finalPrice, totalFee };
		}
	}

	function calculateUsdErgFromTotal(direction: bigint, buyTotalInput: any): any {
		const totalSigUSD = new BigNumber(buyTotalInput)
			.multipliedBy('100')
			.integerValue(BigNumber.ROUND_CEIL);

		if (!totalSigUSD.isNaN() && totalSigUSD.gt(0)) {
			const totalSC = BigInt(totalSigUSD.toString());
			const {
				rateSCERG,
				fee: feeContract,
				bcDeltaExpectedWithFee
			} = calculateSigUsdRateWithFee(inErg, inCircSigUSD, oraclePrice, totalSC, direction);

			const feeUI = (bcDeltaExpectedWithFee * FEE_UI) / FEE_UI_DENOM;
			const miningFee = FEE_MINING_MIN;
			const feeTotal = feeContract + miningFee + feeUI;

			const totalErgoRequired = bcDeltaExpectedWithFee + feeUI + miningFee;
			const rateTotal = new BigNumber(totalSC.toString()).dividedBy(totalErgoRequired.toString());

			const totalErg = new BigNumber(totalErgoRequired.toString())
				.dividedBy('1000000000')
				.toFixed(9);
			const finalPrice = new BigNumber(10000000).multipliedBy(rateTotal).toFixed(2);
			const totalFee = new BigNumber(feeTotal.toString()).dividedBy('1000000000').toFixed(9);
			return { totalErg, finalPrice, totalFee };
		} else {
			const totalErg = '';
			const finalPrice = '';
			const totalFee = '';
			return { totalErg, finalPrice, totalFee };
		}
	}
</script>

<div class="actions">
	<!-- Остальная часть кода -->
	<div class="actions_contentWrapper">
		<!-- ... -->
		<div class="actions_buySellWrapper">
			<!-- Buy Section -->
			<div class="actions_buyWrapper actions_doWrapper">
				<!-- Balance -->
				<!-- ... -->
				<!-- Amount Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm">
							<span class="ant-input-prefix">
								<span class="plus-minus_prefix__IJXO_">Amount</span>
							</span>
							<input
								placeholder=""
								data-testid="spot-trade-buyAmount"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleBuyAmountChange}
								bind:value={buyAmountInput}
							/>
							<span class="ant-input-suffix"><span>ERG</span> </span>
						</span>
					</div>
				</div>
				<!-- Price Input (readonly) -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm">
							<span class="ant-input-prefix">
								<span class="plus-minus_prefix__IJXO_">Price</span>
							</span>
							<input
								placeholder=""
								data-testid="spot-trade-buyPrice"
								class="ant-input ant-input-sm"
								type="text"
								bind:value={buyPriceInput}
								readonly
							/>
							<span class="ant-input-suffix"><span>SigUSD</span> </span>
						</span>
					</div>
				</div>
				<!-- Total Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm">
							<span class="ant-input-prefix">
								<span class="plus-minus_prefix__IJXO_">Total</span>
							</span>
							<input
								placeholder=""
								data-testid="spot-trade-buyTotal"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleBuyTotalChange}
								bind:value={buyTotalInput}
							/>
							<span class="ant-input-suffix"><span>SigUSD</span> </span>
						</span>
					</div>
				</div>
				<!-- Fee Input (readonly) -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm">
							<span class="ant-input-prefix">
								<span class="plus-minus_prefix__IJXO_">Fee</span>
							</span>
							<input
								placeholder=""
								data-testid="spot-trade-buyFee"
								class="ant-input ant-input-sm"
								type="text"
								bind:value={buyFeeInput}
								readonly
							/>
							<span class="ant-input-suffix"><span>ERG</span> </span>
						</span>
					</div>
				</div>
				<!-- Buy Button -->
				<!-- ... -->
			</div>
		</div>
	</div>
</div>

<style>
	/* Ваши стили остаются без изменений */
</style>
