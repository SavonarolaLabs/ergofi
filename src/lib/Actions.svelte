<script lang="ts">
	//bind:value={sellTotalInput}
	//bind:value={buyTotalInput}

	// Replace external imports with dummy data
	const BOB_ADDRESS = 'dummy_bob_address';
	const BOB_MNEMONIC = 'dummy_bob_mnemonic';

	const TOKEN = {
		SigUSD: { tokenId: 'dummy_sigusd_tokenid', decimals: 2 },
		rsBTC: { tokenId: 'dummy_rsbtc_tokenid', decimals: 8 }
	};

	const b = {}; // Dummy object
	const signTxInput = {}; // Dummy object

	async function configureSwapTx(params) {
		// Dummy function
		return params;
	}

	import BigNumber from 'bignumber.js';

	let crystalwallet_locked = false;
	let show_wallet_unlock_dialog = false;
	let user_address = 'dummy_user_address';
	let user_mnemonic = 'dummy_user_mnemonic';
	let user_tokens = [
		{ name: 'SigUSD', amount: 1000000000, decimals: 2 },
		{ name: 'rsBTC', amount: 1000000000, decimals: 8 }
	];
	let wallet_initialized = true;

	async function createAndMultisigSwapTx(swapParams, b, user_mnemonic, user_address) {
		// Dummy function
		return { txId: 'dummy_tx_id' };
	}
	async function executeAndSignInputsSwapTx(swapParams, signTxInput) {
		// Dummy function
		return { txId: 'dummy_tx_id' };
	}

	// Replace 'goto' with a dummy function
	function goto(path: string) {
		console.log('Navigate to', path);
	}

	type SwapRequest = {
		address?: string;
		makerPk?: string;
		price: string;
		nanoErg?: number;
		makerToken?: {
			tokenId: string;
			amount: string;
		};
		takerTokenId?: string;
		tradingPair?: string;
		side: 'BUY' | 'SELL';
		amount?: string;
		sellingTokenId?: string;
		buyingTokenId?: string;
	};

	const SAFE_MIN_BOX_VALUE = 1000000; // Dummy value

	function asBigInt(value) {
		return BigInt(value);
	}

	let buyPriceInput = '69000';
	let buyAmountInput = '0.1';
	let buyTotalInput = (parseFloat(buyPriceInput) * parseFloat(buyAmountInput))
		.toFixed(8)
		.replace(/\.?0+$/, '');

	let sellPriceInput = '69000';
	let sellAmountInput = '0.1';
	let sellTotalInput = (parseFloat(sellPriceInput) * parseFloat(sellAmountInput))
		.toFixed(8)
		.replace(/\.?0+$/, '');

	function handleBuyPriceChange(event) {
		buyPriceInput = event.target.value;
		calcBuyTotal();
	}

	function handleBuyAmountChange(event) {
		buyAmountInput = event.target.value;
		calcBuyTotal();
	}

	function handleBuyTotalChange(event) {
		buyTotalInput = event.target.value;
		calcBuyAmount();
	}

	function handleSellPriceChange(event) {
		sellPriceInput = event.target.value;
		calcSellTotal();
	}

	function handleSellAmountChange(event) {
		sellAmountInput = event.target.value;
		calcSellTotal();
	}

	function handleSellTotalChange(event) {
		sellTotalInput = event.target.value;
		calcSellAmount();
	}

	function calcBuyTotal() {
		const price = parseFloat(buyPriceInput);
		const amount = parseFloat(buyAmountInput);
		if (!isNaN(price) && !isNaN(amount)) {
			buyTotalInput = (price * amount).toFixed(8).replace(/\.?0+$/, '');
		}
	}

	function calcBuyAmount() {
		const total = parseFloat(buyTotalInput);
		const price = parseFloat(buyPriceInput);
		if (!isNaN(price) && !isNaN(total)) {
			buyAmountInput = (total / price).toFixed(8).replace(/\.?0+$/, '');
		}
	}

	function calcSellTotal() {
		const price = parseFloat(sellPriceInput);
		const amount = parseFloat(sellAmountInput);
		if (!isNaN(price) && !isNaN(amount)) {
			sellTotalInput = (price * amount).toFixed(8).replace(/\.?0+$/, '');
		}
	}

	function calcSellAmount() {
		const total = parseFloat(sellTotalInput);
		const price = parseFloat(sellPriceInput);
		if (!isNaN(price) && !isNaN(total)) {
			sellAmountInput = (total / price).toFixed(8).replace(/\.?0+$/, '');
		}
	}

	function dummySwapParams() {
		const address = BOB_ADDRESS;

		const price = '100';
		const amount = 200n;
		const sellingTokenId = TOKEN.SigUSD.tokenId;
		const buyingTokenId = TOKEN.rsBTC.tokenId;

		const swapParams: SwapRequest = {
			makerPk: address,
			price: price,
			nanoErg: SAFE_MIN_BOX_VALUE,
			makerToken: {
				tokenId: sellingTokenId,
				amount: asBigInt(amount)
			},
			takerTokenId: buyingTokenId,
			tradingPair: 'rsBTC_SigUSD',
			side: 'SELL'
		};

		return swapParams;
	}

	async function swapExecuteBuy() {
		const sellingToken = TOKEN.rsBTC;
		const buyingToken = TOKEN.SigUSD;

		// take user inputs
		const amountInput = new BigNumber(buyAmountInput);
		const priceInput = new BigNumber(buyPriceInput);

		// load and calculate decimals
		const decimalsToken = TOKEN.rsBTC.decimals;
		const decimalsCurrency = TOKEN.SigUSD.decimals;
		const bigDecimalsToken = new BigNumber(10).pow(decimalsToken);
		const bigDecimalsCurrency = new BigNumber(10).pow(decimalsCurrency);
		const bigDecimalsDelta = bigDecimalsToken.dividedBy(bigDecimalsCurrency);

		// apply decimals
		const real_price = priceInput.dividedBy(bigDecimalsDelta);
		const real_amount = amountInput.multipliedBy(bigDecimalsToken);
		const total = real_price.multipliedBy(real_amount);

		console.log('real price: 1 sat in cents =', real_price.toString());
		console.log('real amount: sats =', real_amount.toString());
		console.log('total amount: cents =', total.toString());

		const swapParams: SwapRequest = {
			makerPk: user_address,
			price: real_price.toString(),
			nanoErg: SAFE_MIN_BOX_VALUE,
			makerToken: {
				tokenId: sellingToken.tokenId,
				amount: real_amount.toString()
			},
			takerTokenId: buyingToken.tokenId,
			tradingPair: 'rsBTC_SigUSD',
			side: 'SELL'
		};
		console.log('swap params for selling:', swapParams);
		//----------------------------
		let signedTx = await executeAndSignInputsSwapTx(swapParams, signTxInput); // UNSIGNED TX
		console.log(signedTx);
	}

	async function swapActionBuy() {
		const sellingToken = TOKEN.SigUSD;
		const buyingToken = TOKEN.rsBTC;

		// take user inputs
		const amountInput = new BigNumber(buyAmountInput);
		const priceInput = new BigNumber(buyPriceInput);

		// load and calculate decimals
		const decimalsToken = TOKEN.rsBTC.decimals;
		const decimalsCurrency = TOKEN.SigUSD.decimals;
		const bigDecimalsToken = new BigNumber(10).pow(decimalsToken);
		const bigDecimalsCurrency = new BigNumber(10).pow(decimalsCurrency);
		const bigDecimalsDelta = bigDecimalsToken.dividedBy(bigDecimalsCurrency);

		// apply decimals to contract
		const real_price = new BigNumber(1)
			.dividedBy(priceInput.dividedBy(bigDecimalsDelta))
			.toString(10); // 1 sats =
		const real_amount = amountInput
			.multipliedBy(priceInput)
			.multipliedBy(bigDecimalsCurrency)
			.toString(10);
		const total = amountInput.multipliedBy(bigDecimalsToken).toString(10);
		console.log('real_price 1 cent in sats = ', real_price);
		console.log('real_amount in cents', real_amount);
		console.log('total in sats', total);

		const swapParams: SwapRequest = {
			address: user_address,
			price: real_price.toString(),
			amount: real_amount.toString(),
			sellingTokenId: sellingToken.tokenId,
			buyingTokenId: buyingToken.tokenId,
			side: 'BUY'
		};

		console.log('swap params for selling:', swapParams);
		//----------------------------
		let signedTx = await createAndMultisigSwapTx(swapParams, b, user_mnemonic, user_address);
		console.log(signedTx);
		return;
	}

	async function swapActionSell() {
		const sellingToken = TOKEN.rsBTC;
		const buyingToken = TOKEN.SigUSD;

		// take user inputs
		const amountInput = new BigNumber(sellAmountInput);
		const priceInput = new BigNumber(sellPriceInput);

		// load and calculate decimals
		const decimalsToken = TOKEN.rsBTC.decimals;
		const decimalsCurrency = TOKEN.SigUSD.decimals;
		const bigDecimalsToken = new BigNumber(10).pow(decimalsToken);
		const bigDecimalsCurrency = new BigNumber(10).pow(decimalsCurrency);
		const bigDecimalsDelta = bigDecimalsToken.dividedBy(bigDecimalsCurrency);

		// apply decimals
		const real_price = priceInput.dividedBy(bigDecimalsDelta);
		const real_amount = amountInput.multipliedBy(bigDecimalsToken);
		const total = real_price.multipliedBy(real_amount);

		console.log('real price: 1 sat in cents =', real_price.toString());
		console.log('real amount: sats =', real_amount.toString());
		console.log('total amount: cents =', total.toString());

		const swapParams: SwapRequest = {
			address: user_address,
			price: real_price.toString(),
			amount: real_amount.toString(),
			sellingTokenId: sellingToken.tokenId,
			buyingTokenId: buyingToken.tokenId,
			side: 'SELL'
		};
		console.log('swap params for selling:', swapParams);
		//----------------------------
		let signedTx = await createAndMultisigSwapTx(swapParams, b, user_mnemonic, user_address);
		console.log(signedTx);
	}

	async function configureBuy() {
		const sellingToken = TOKEN.rsBTC;
		const buyingToken = TOKEN.SigUSD;

		// take user inputs
		const amountInput = new BigNumber(buyAmountInput);
		const priceInput = new BigNumber(buyPriceInput);

		// load and calculate decimals
		const decimalsToken = TOKEN.rsBTC.decimals;
		const decimalsCurrency = TOKEN.SigUSD.decimals;
		const bigDecimalsToken = new BigNumber(10).pow(decimalsToken);
		const bigDecimalsCurrency = new BigNumber(10).pow(decimalsCurrency);
		const bigDecimalsDelta = bigDecimalsToken.dividedBy(bigDecimalsCurrency);

		// apply decimals
		const real_price = priceInput.dividedBy(bigDecimalsDelta);
		const real_amount = amountInput.multipliedBy(bigDecimalsToken);
		const total = real_price.multipliedBy(real_amount);

		console.log('real price: 1 sat in cents =', real_price.toString());
		console.log('real amount: sats =', real_amount.toString());
		console.log('total amount: cents =', total.toString());

		const swapParams: SwapRequest = {
			address: user_address,
			price: real_price.toString(),
			amount: real_amount.toString(),
			sellingTokenId: sellingToken.tokenId,
			buyingTokenId: buyingToken.tokenId,
			side: 'SELL'
		};
		console.log('swap params for configuring buy action:', swapParams);

		// Request Server
		let swapParamsExecute = await configureSwapTx(swapParams); // new SwapParams
		console.log(swapParamsExecute);

		// Execute it
		let signedTx = await executeAndSignInputsSwapTx(swapParamsExecute, signTxInput); // UNSIGNED TX
		console.log(signedTx);
	}
</script>

<div class="actions">
	<div class="actions_header">
		<div class="actions_headerTabActive">Spot</div>
		<div class="fee">
			Maker <span style="display: inline-block; direction: ltr;">0.000%</span>
			/ Taker
			<span style="display: inline-block; direction: ltr;">0.200%</span>
		</div>
	</div>
	<div class="actions_contentWrapper">
		<div
			class="actions_line actions_mode__nRnKJ actions_textNowarp__3QcjB actions_modeActive__VpeUM"
		>
			Limit
		</div>

		<!-- START -->

		<div class="actions_buySellWrapper">
			<!-- Buy Section -->
			<div class="actions_buyWrapper actions_doWrapper">
				<!-- Balance -->
				<div class="actions_balance">
					<div>
						<span class="actions_primaryText" style="margin-inline-end: 8px;">Available </span><span
							><span>
								{(user_tokens.find((t) => t.name == 'SigUSD')?.amount ?? 0) /
									10 ** (user_tokens.find((t) => t.name == 'SigUSD')?.decimals ?? 2)}
							</span><span> SigUSD</span></span
						>
					</div>
					<a href="/assets/deposit/SigUSD" class="actions_deposit">
						<!-- SVG icon -->
					</a>
				</div>

				<!-- Amount Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Amount</span></span
							><input
								placeholder=""
								data-testid="spot-trade-buyQuantity"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleBuyAmountChange}
								bind:value={buyAmountInput}
							/><span class="ant-input-suffix"><span>ERG</span> </span></span
						>
					</div>
				</div>
				<!-- Price Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Price</span></span
							><input
								placeholder=""
								data-testid="spot-trade-buyPrice"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleBuyPriceChange}
								bind:value={buyPriceInput}
							/><span class="ant-input-suffix"><span>SigUSD</span> </span></span
						>
					</div>
				</div>
				<!-- Total Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Total</span></span
							><input
								placeholder=""
								data-testid="spot-trade-buyTotal"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleBuyTotalChange}
								bind:value={buyTotalInput}
							/><span class="ant-input-suffix"><span>SigUSD</span> </span></span
						>
					</div>
				</div>
				<!-- Buy Button -->
				{#if wallet_initialized}
					<button class="buySellButton buyButton" on:click={configureBuy}>Buy ERG</button>
				{:else if crystalwallet_locked}
					<button
						class="buySellButton buyButton"
						on:click={() => {
							show_wallet_unlock_dialog = true;
						}}
					>
						Unlock Wallet
					</button>
				{:else}
					<button class="buySellButton buyButton" on:click={() => goto('/wallet')}>
						Create/Restore Wallet
					</button>
				{/if}
			</div>

			<!-- Sell Section -->
			<div class="actions_sellWrapper actions_doWrapper">
				<!-- Balance -->
				<div class="actions_balance">
					<div>
						<span class="actions_primaryText" style="margin-inline-end: 8px;">Available </span><span
							><span>
								{(user_tokens.find((t) => t.name == 'rsBTC')?.amount ?? 0) /
									10 ** (user_tokens.find((t) => t.name == 'rsBTC')?.decimals ?? 8)}
							</span><span> ERG</span></span
						>
					</div>
					<a href="/assets/deposit/rsBTC" class="actions_deposit">
						<!-- SVG icon -->
					</a>
				</div>
				<!-- Amount Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Amount</span></span
							><input
								placeholder=""
								data-testid="spot-trade-sellQuantity"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleSellAmountChange}
								bind:value={sellAmountInput}
							/><span class="ant-input-suffix"><span>ERG</span> </span></span
						>
					</div>
				</div>
				<!-- Price Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Price</span></span
							><input
								placeholder=""
								data-testid="spot-trade-sellPrice"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleSellPriceChange}
								bind:value={sellPriceInput}
							/><span class="ant-input-suffix"><span>SigUSD</span> </span></span
						>
					</div>
				</div>

				<!-- Total Input -->
				<div class="actions_inputWrapper__OKcnB actions_line">
					<div class="plus-minus_wrapper__ht_aW">
						<span class="ant-input-affix-wrapper input-plus-minus ant-input-affix-wrapper-sm"
							><span class="ant-input-prefix"
								><span class="plus-minus_prefix__IJXO_">Total</span></span
							><input
								placeholder=""
								data-testid="spot-trade-sellTotal"
								class="ant-input ant-input-sm"
								type="text"
								on:input={handleSellTotalChange}
								bind:value={sellTotalInput}
							/><span class="ant-input-suffix"><span>SigUSD</span> </span></span
						>
					</div>
				</div>
				<!-- Sell Button -->
				{#if wallet_initialized}
					<button class="buySellButton sellButton" on:click={swapActionSell}> Sell ERG </button>
				{:else if crystalwallet_locked}
					<button
						class="buySellButton sellButton"
						on:click={() => {
							show_wallet_unlock_dialog = true;
						}}
					>
						Unlock Wallet
					</button>
				{:else}
					<button class="buySellButton sellButton" on:click={() => goto('/wallet')}>
						Create/Restore Wallet
					</button>
				{/if}
			</div>
		</div>

		<!-- END -->
	</div>
</div>

<style lang="postcss">
	.actions {
		background-color: var(--bg-level-secondary);
	}
	.actions_header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--divider-primary);
		padding: 0 16px;
		flex-shrink: 0;
		line-height: 40px;
	}
	.actions_headerTabActive {
		font-weight: 500;
	}
	.fee {
		color: var(--tint-blue-base);
		background-color: var(--tint-blue-smooth);
		font-size: 12px;
		border-radius: 2px;
		padding: 0 6px;
		line-height: 20px;
	}
	.actions_contentWrapper {
		padding: 5px 16px 13px;
	}
	.actions_line {
		margin-bottom: 10px;
		margin-top: 5px;
	}
	.actions_buySellWrapper {
		display: flex;
		justify-content: space-between;
		align-items: stretch;
		position: relative;
	}
	.actions_balance {
		margin-bottom: 5px;
		min-height: 28px;
		font-size: 12px;
		display: flex;
		align-items: center;
	}
	.actions_primaryText {
		color: var(--primary-text);
	}
	.actions_deposit {
		padding-inline-start: 4px;
		color: var(--primary-base);
	}
	.actions_buyWrapper {
		padding-inline-end: 12px;
	}
	.actions_sellWrapper {
		padding-inline-start: 12px;
	}
	.actions_doWrapper {
		flex-grow: 1;
		width: 50%;
	}
	.buySellButton {
		height: 36px;
		width: 100%;
		border: none;
		color: #fff;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.16s ease-in;
	}
	.buyButton {
		background-color: var(--up);
	}
	.sellButton {
		background-color: var(--down);
	}
</style>
