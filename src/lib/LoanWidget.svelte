<script lang="ts">
	import { TransactionFactory } from './transactionFactory';
	import type { OpenOrderParams } from './plugins';
	import { VERIFIED_ASSETS } from './maps/verifiedAssets';
	import { ASSET_ICONS } from './maps/assetIcons';

	const timeUnits = ['days', 'months'];
	const BLOCKS_PER_DAY = 720; // Предположение
	const ERG_PRICE = 2; // TODO: PRICE - ASSETS

	let showModal = false;
	let amount = 0;
	let amountInUsd = 0;
	let interestRate = 0;
	let interest = 0;
	let repayment = '';
	let term = 0;
	let termInBlocks = 0;
	let timeUnit = timeUnits[0]; // "days" по умолчанию
	let collateral = '';
	let collateralInUsd = 10; //TEST
	let collateralRate = '420'; // TEST
	let selectedAsset = VERIFIED_ASSETS[0].metadata.name;
	let loading = false;
	let error = '';

	// геты
	function getTokenId(assetName: string) {
		return VERIFIED_ASSETS.find((asset) => asset.metadata.name === assetName)?.tokenId || '';
	}
	function getTokenDecimals(assetName: string) {
		return VERIFIED_ASSETS.find((asset) => asset.metadata.name === assetName)?.decimals || '';
	}
	function getAssetIcon(assetName: string) {
		const tokenId = getTokenId(assetName);
		return `/asset-icons/${ASSET_ICONS[tokenId] || 'default.png'}`;
	}

	async function handleCreateTransaction() {
		loading = true;
		error = '';
		try {
			//const termInBlocks = calculateMaturityBlocks();
			const tokenId = getTokenId(selectedAsset);
			const orderParams: Omit<OpenOrderParams, 'borrower'> = {
				type: 'on-close',
				loan: {
					amount: BigInt(Number(amount) * 1e9),
					repayment: BigInt(Number(repayment) * 1e9),
					tokenId: tokenId
				},
				maturityLength: termInBlocks,
				collateral: {
					nanoErgs: BigInt(Number(collateral) * 1e9)
				}
			};

			const signedTx = await TransactionFactory.openOrder(orderParams);
			alert(`Transaction created successfully!`);
			resetForm();
			showModal = false;
		} catch (err) {
			error = 'Failed to create transaction. Check the console for details.';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function handleAmountChange() {
		calculateAmountInUSD();
		calculateInterest();
		calculateCollateralRate();
	}
	async function handleTermChange() {
		termInBlocks = calculateMaturityBlocks();
	}
	async function handleTimeUnitChange() {
		termInBlocks = calculateMaturityBlocks();
	}
	async function handleInterestChange() {
		calculateInterest();
		calculateCollateralRate();
	}
	async function handleCollateralChange() {
		calculateCollateralInUsd();
		calculateCollateralRate();
	}

	function resetForm() {
		amount = '';
		repayment = '';
		term = 0;
		collateral = '';
		selectedAsset = VERIFIED_ASSETS[0].metadata.name;
		timeUnit = 'days';
	}

	// вычисления
	function calculateInterest() {
		interest = (Number(interestRate) * Number(amount)) / 100; //Должна зависить от ассета который вычисляется (Decimals)
	}
	function calculateCollateralRate() {
		//Test Function
		collateralRate = Math.floor(
			(100 * (Number(collateral) * ERG_PRICE)) / (Number(amount) * ERG_PRICE + interest * ERG_PRICE)
		).toString();
	}
	function calculateCollateralInUsd() {
		collateralInUsd = Number(collateral) * ERG_PRICE;
	}
	function calculateAmountInUSD() {
		amountInUsd = Number(amount) * ERG_PRICE;
	}
	function calculateMaturityBlocks() {
		return timeUnit === 'days' ? term * BLOCKS_PER_DAY : term * BLOCKS_PER_DAY * 30;
	}
</script>

<!-- UI -->
<button on:click={() => (showModal = true)} class="rounded bg-blue-500 px-4 py-2 text-white">
	New Loan Request
</button>

{#if showModal}
	<div class="modal">
		<div class="modal-content gap-6">
			<h3 class="flex items-center justify-between text-xl font-semibold">
				<span>New loan request</span>
				<div class="tooltip tooltip-left tooltip-left font-normal" data-tip="Collateral/Loan ratio">
					<span class="badge-error badge-warning badge gap-1"
						><svg
							xmlns="http://www.w3.org/2000/svg"
							width="16px"
							height="16px"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="feather feather-alert-triangle h-3 h-3"
							><path
								d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
							></path><line x1="12" y1="9" x2="12" y2="13"></line><line
								x1="12"
								y1="17"
								x2="12.01"
								y2="17"
							></line></svg
						>
						{collateralRate}%</span
					>
				</div>
			</h3>

			<!-- Заголовок Amount -->
			<div class="form-control">
				<label class="label" for="amount">
					<span class="labe-text big">Amount </span>
					<span class="label-text-alt opacity-70"> ${amountInUsd} </span>
				</label>

				<!-- Контейнер с Amount и Currency -->
				<div class="input-group">
					<!-- Поле ввода Amount -->
					<div class="input input-bordered input-lg align-content:center w-full">
						<input
							id="amount"
							type="number"
							bind:value={amount}
							on:change={handleAmountChange}
							class="input h-12 w-full"
							placeholder="0.00"
						/>
					</div>

					<!-- Выбор валюты с иконкой -->
					<div class="input input-bordered input-lg select relative flex w-full items-center">
						<img src={getAssetIcon(selectedAsset)} alt="icon" class="mr-2 h-5 w-5" />
						<select
							bind:value={selectedAsset}
							class="currency-select w-full bg-transparent text-white outline-none"
						>
							{#each VERIFIED_ASSETS as asset}
								<option value={asset.metadata.name}>{asset.metadata.name}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Term и Interest на одной строке -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="form-control">
					<label class="label" for="term">
						<span class="label-text">Term</span>
						<span class="label-text-alt opacity-70"> {termInBlocks} blocks</span>
					</label>
					<div class="input-group">
						<input
							id="term"
							type="number"
							bind:value={term}
							on:change={handleTermChange}
							class="input input-bordered w-full"
							placeholder="0"
							min="1"
						/>

						<select
							bind:value={timeUnit}
							on:change={handleTimeUnitChange}
							class="select select-bordered border-l-0"
						>
							{#each timeUnits as unit}
								<option value={unit}>{unit}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="interestRate">
						<span class="label-text">Interest</span>
						<span class="label-text-alt opacity-70"> {interest} ERG</span>
					</label>
					<div class="input-group">
						<input
							id="interestRate"
							type="number"
							bind:value={interestRate}
							on:change={handleInterestChange}
							class="input input-bordered w-full"
							placeholder="0.00"
							min="0.1"
						/>
						<span class="!border-l-0">%</span>
					</div>
				</div>
			</div>

			<!-- Collateral -->
			<div class="form-control">
				<label class="label" for="collateral">
					<span class="label-text big">Collateral</span>
					<span class="label-text-alt opacity-70"> ${collateralInUsd}</span>
				</label>
				<input
					id="collateral"
					type="number"
					bind:value={collateral}
					on:change={handleCollateralChange}
					class="input input-bordered w-full"
					placeholder="0.00"
				/>
			</div>

			<!-- Ошибка -->
			{#if error}
				<p class="text-red-500">{error}</p>
			{/if}

			<!-- Кнопки -->
			<div class="mt-4 flex justify-end space-x-4">
				<button on:click={() => (showModal = false)} class="text-gray-400">Cancel</button>
				<button
					on:click={handleCreateTransaction}
					class="rounded bg-green-500 px-4 py-2 text-white"
					disabled={loading}
				>
					{loading ? 'Processing...' : 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
		background: rgba(0, 0, 0, 0.6);
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal-content {
		background: #1e1e2e;
		color: white;
		padding: 2rem;
		border-radius: 8px;
		width: 100%;
		max-width: 450px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	.label {
		display: flex;
		-webkit-user-select: none;
		-moz-user-select: none;
		user-select: none;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.25rem;
	}

	.label-text {
		font-size: 0.875rem;
		line-height: 1.25rem;
		--tw-text-opacity: 1;
		color: hsl(var(--bc) / var(--tw-text-opacity));
	}
	.label-text.big {
		font-size: 1.125rem;
		line-height: 1.75rem;
	}
	.label-text-alt {
		font-size: 0.75rem;
		line-height: 1rem;
		--tw-text-opacity: 1;
		color: hsl(var(--bc) / var(--tw-text-opacity));
	}

	.input-group {
		display: flex;
		width: 100%;
		align-items: stretch;
	}

	.input-group > :first-child {
		border-top-left-radius: var(--rounded-btn, 0.5rem);
		border-top-right-radius: 0;
		border-bottom-left-radius: var(--rounded-btn, 0.5rem);
		border-bottom-right-radius: 0;
	}
	.input-group > :last-child {
		border-top-left-radius: 0;
		border-top-right-radius: var(--rounded-btn, 0.5rem);
		border-bottom-left-radius: 0;
		border-bottom-right-radius: var(--rounded-btn, 0.5rem);
	}
	.input-group :where(span) {
		display: flex;
		align-items: center;
		--tw-bg-opacity: 1;
		background-color: hsl(var(--b3, var(--b2)) / var(--tw-bg-opacity));
		padding-left: 1rem;
		padding-right: 1rem;
		background: #2e2e3e;
	}

	.input {
		background: #2e2e3e;
		color: white;
		padding: 0.75rem;
		border: 1px solid #444;
		border-radius: 4px;
		font-size: 1rem;
		height: 100%;
	}
	.input-bordered {
		--tw-border-opacity: 0.2;
	}

	.input-lg {
		height: 4rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		font-size: 1.125rem;
		line-height: 1.75rem;
		line-height: 2;
	}
	.w-full {
		width: 100%;
	}
	.currency-select {
		background: transparent;
		color: white;
		padding: 0.25rem 0.5rem;
		border: none;
		appearance: none;
		font-size: 1rem;
		cursor: pointer;
	}
	.time-select {
		background: transparent;
		color: white;
		padding: 0.25rem 0.5rem;
		border: none;
		appearance: none;
		font-size: 1rem;
		cursor: pointer;
	}
	.select {
		--tw-bg-opacity: 1;
		font-size: 1rem;
		color: white;
		background: #2e2e3e;
	}
	.select-bordered {
		--tw-border-opacity: 0.2;
	}
	.border-l-0 {
		border-left-width: 0px;
	}
	.\!border-l-0 {
		border-left-width: 0px !important;
	}
	.form-control {
		display: flex;
		flex-direction: column;
	}
	.h-12 {
		height: 3rem; /* 48px */
	}
	.sm\:grid-cols-2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.grid {
		display: grid;
	}
	.gap-2 {
		gap: 0.5rem;
	}
	.gap-4 {
		gap: 1rem;
	}
	.gap-6 {
		gap: 1.5rem;
	}
	button {
		cursor: pointer;
	}
	.opacity-70 {
		opacity: 0.7;
	}
	.font-semibold {
		font-weight: 600;
	}
	.font-normal {
		font-weight: 400;
	}
	.tooltip {
		position: relative;
		display: inline-block;
		--tooltip-offset: calc(100% + 1px + var(--tooltip-tail, 0px));
		text-align: center;
		--tooltip-tail: 3px;
		--tooltip-color: hsl(var(--n));
		--tooltip-text-color: hsl(var(--nc));
		--tooltip-tail-offset: calc(100% + 1px - var(--tooltip-tail));
	}
	.tooltip:before {
		position: absolute;
		pointer-events: none;
		z-index: 999;
		content: var(--tw-content);
		--tw-content: attr(data-tip);
		max-width: 20rem;
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		background-color: var(--tooltip-color);
		color: var(--tooltip-text-color);
		width: -moz-max-content;
		width: max-content;
	}
	.tooltip-left:before {
		transform: translateY(-50%);
		top: 50%;
		left: auto;
		right: var(--tooltip-offset);
		bottom: auto;
	}
	.tooltip:after {
		position: absolute;
		content: '';
		border-style: solid;
		border-width: var(--tooltip-tail, 0);
		width: 0;
		height: 0;
		display: block;
	}
</style>
