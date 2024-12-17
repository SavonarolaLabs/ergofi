<script lang="ts">
	import { TransactionFactory } from './transactionFactory'; // Импортируем TransactionFactory
	import type { OpenOrderParams } from './plugins'; // Импортируем тип параметров
	import { writable } from 'svelte/store';

	// UI переменные
	let showModal = false;
	let amount = '';
	let repayment = '';
	let term = 0;
	let collateral = '';
	let loading = false;
	let error = '';

	async function handleCreateTransaction() {
		loading = true;
		error = '';
		try {
			// Формируем параметры для ордера
			const orderParams: Omit<OpenOrderParams, 'borrower'> = {
				type: 'on-close',
				loan: {
					amount: BigInt(Number(amount) * 1e9), // ERG в NanoERG
					repayment: BigInt(Number(repayment) * 1e9), // Repayment
					tokenId: 'ERG'
				},
				maturityLength: term,
				collateral: {
					nanoErgs: BigInt(Number(collateral) * 1e9)
				}
			};

			// Создаем ордер через TransactionFactory
			const txId = await TransactionFactory.openOrder(orderParams);

			alert(`Transaction created successfully! TX ID: ${txId}`);
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
	}
</script>

<!-- UI -->
<button on:click={() => (showModal = true)} class="rounded bg-blue-500 px-4 py-2 text-white">
	Create Order
</button>

{#if showModal}
	<div class="modal">
		<div class="modal-content">
			<h2>Create a New Loan Order</h2>
			<label for="amount">Loan Amount (ERG)</label>
			<input id="amount" type="number" bind:value={amount} min="0.1" step="0.1" />

			<label for="repayment">Repayment (ERG)</label>
			<input id="repayment" type="number" bind:value={repayment} min="0.1" step="0.1" />

			<label for="term">Term (Blocks)</label>
			<input id="term" type="number" bind:value={term} min="1" step="1" />

			<label for="collateral">Collateral (ERG)</label>
			<input id="collateral" type="number" bind:value={collateral} min="0.1" step="0.1" />

			{#if error}
				<p class="text-red-500">{error}</p>
			{/if}

			<div class="flex justify-end space-x-2">
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
		background: #333;
		color: white;
		padding: 1.5rem;
		border-radius: 8px;
		width: 100%;
		max-width: 400px;
	}
	input {
		width: 100%;
		padding: 0.5rem;
		margin-bottom: 1rem;
		background: #222;
		color: white;
		border: 1px solid #555;
		border-radius: 4px;
	}
</style>
