<script lang="ts">
	import { TransactionFactory } from './transactionFactory';
	import type { OpenOrderParams } from './plugins';
	import { VERIFIED_ASSETS } from './maps/verifiedAssets';
	import { ASSET_ICONS } from './maps/assetIcons';

	const timeUnits = ['days', 'months'];

	let showModal = false;
	let amount = '';
	let repayment = '';
	let term = 0;
	let timeUnit = timeUnits[0]; // "days" по умолчанию
	let collateral = '';
	let selectedAsset = VERIFIED_ASSETS[0].metadata.name;
	let loading = false;
	let error = '';

	function getTokenId(assetName: string) {
		return VERIFIED_ASSETS.find((asset) => asset.metadata.name === assetName)?.tokenId || '';
	}

	function getAssetIcon(assetName: string) {
		const tokenId = getTokenId(assetName);
		return `/asset-icons/${ASSET_ICONS[tokenId] || 'default.png'}`;
	}

	async function handleCreateTransaction() {
		loading = true;
		error = '';
		try {
			const blocksPerDay = 720;
			const termInBlocks = timeUnit === 'days' ? term * blocksPerDay : term * blocksPerDay * 30;

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

	function resetForm() {
		amount = '';
		repayment = '';
		term = 0;
		collateral = '';
		selectedAsset = VERIFIED_ASSETS[0].metadata.name;
		timeUnit = 'days';
	}
</script>

<!-- UI -->
<button on:click={() => (showModal = true)} class="rounded bg-blue-500 px-4 py-2 text-white">
	New Loan Request
</button>

{#if showModal}
	<div class="modal">
		<div class="modal-content gap-6">
			<h2 class="mb-4 text-lg font-semibold">New Loan Request</h2>

			<!-- Заголовок Amount -->
			<div class="form-control">
				<label class="label" for="amount">
					<span class="labe-text big">Amount </span>
					<span class="label-text-alt opacity-70"> $100 </span>
				</label>

				<!-- Контейнер с Amount и Currency -->
				<div class="input-group">
					<!-- Поле ввода Amount -->
					<div class="input input-bordered input-lg align-content:center w-full">
						<input
							id="amount"
							type="number"
							bind:value={amount}
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
						<span class="label-text-alt opacity-70"> 10000 blocks</span>
					</label>
					<div class="input-group">
						<input
							id="term"
							type="number"
							bind:value={term}
							class="input input-bordered w-full"
							placeholder="0"
							min="1"
						/>

						<select bind:value={timeUnit} class="select select-bordered border-l-0">
							{#each timeUnits as unit}
								<option value={unit}>{unit}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-control">
					<label class="label" for="repayment">
						<span class="label-text">Interest (%)</span>
						<span class="label-text-alt opacity-70"> 100 ERG</span>
					</label>
					<div class="input-group">
						<input
							id="repayment"
							type="number"
							bind:value={repayment}
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
					<span class="label-text-alt opacity-70"> $666</span>
				</label>
				<input
					id="collateral"
					type="number"
					bind:value={collateral}
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
</style>
