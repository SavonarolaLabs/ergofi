<script lang="ts">
	import { createLoan } from './loans';
	import { writable } from 'svelte/store';

	// Переменные для формы
	let showModal: boolean = false;
	let amount: string = ''; // Сумма займа (ввод в ERG, конвертация в nanoERG)
	let repayment: string = ''; // Сумма погашения
	let term: number = 0; // Срок займа (в блоках)
	let collateral: string = ''; // Обеспечение (в ERG)
	let loading: boolean = false;
	let error: string = '';

	// Жестко заданный тип займа (строковый литерал)
	const loanType: 'on-close' | 'fixed-height' = 'on-close'; // Фиксированный тип займа
	const tokenId: string = 'ERG'; // Идентификатор токена (пример с ERG)

	// Сброс формы после успешного создания займа или отмены
	const resetForm = () => {
		amount = '';
		repayment = '';
		term = 0;
		collateral = '';
		error = '';
	};

	// Обработчик создания займа
	async function handleCreateLoan() {
		loading = true; // Включаем состояние загрузки
		error = ''; // Сбрасываем ошибки
		try {
			// Преобразуем данные формы для передачи в createLoan
			const loanParams = {
				type: loanType,
				amount: BigInt(Number(amount) * 1e9), // Конвертация из ERG в nanoERG
				repayment: BigInt(Number(repayment) * 1e9), // Погашение в nanoERG
				tokenId,
				maturityLength: term,
				collateral: BigInt(Number(collateral) * 1e9) // Обеспечение в nanoERG
			};

			// Вызываем функцию для создания займа
			const txId = await createLoan(loanParams);
			alert(`Loan created successfully! Transaction ID: ${txId}`);
			showModal = false; // Закрываем модальное окно
			resetForm(); // Сбрасываем форму
		} catch (err) {
			error = 'Failed to create loan. Check console for details.'; // Выводим ошибку
			console.error(err);
		} finally {
			loading = false; // Отключаем состояние загрузки
		}
	}
</script>

<!-- Кнопка открытия формы -->
<button
	on:click={() => (showModal = true)}
	class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
>
	Add New Loan
</button>

<!-- Модальное окно -->
{#if showModal}
	<div class="modal">
		<div class="modal-content">
			<h2 class="mb-4 text-lg font-bold">New Loan Request</h2>

			<!-- Поле ввода Amount -->
			<label for="amount">Amount (ERG)</label>
			<input
				id="amount"
				type="number"
				placeholder="0.00"
				class="input"
				bind:value={amount}
				min="0"
				step="0.01"
			/>

			<!-- Поле ввода Repayment Amount -->
			<label for="repayment">Repayment Amount (ERG)</label>
			<input
				id="repayment"
				type="number"
				placeholder="0.00"
				class="input"
				bind:value={repayment}
				min="0"
				step="0.01"
			/>

			<!-- Поле ввода Term -->
			<label for="term">Term (blocks)</label>
			<input id="term" type="number" placeholder="0" class="input" bind:value={term} min="0" />

			<!-- Поле ввода Collateral -->
			<label for="collateral">Collateral (ERG)</label>
			<input
				id="collateral"
				type="number"
				placeholder="0.00"
				class="input"
				bind:value={collateral}
				min="0"
				step="0.01"
			/>

			<!-- Отображение ошибки -->
			{#if error}
				<div class="mt-2 text-red-400">{error}</div>
			{/if}

			<!-- Кнопки действий -->
			<div class="actions">
				<button on:click={() => (showModal = false)} class="text-gray-400 hover:text-gray-300">
					CANCEL
				</button>
				<button
					on:click={handleCreateLoan}
					class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
					disabled={loading}
				>
					{#if loading}Loading...{:else}CONFIRM{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal-content {
		background: #1e1e2f;
		color: white;
		padding: 1.5rem;
		border-radius: 8px;
		width: 90%;
		max-width: 400px;
		z-index: 1001;
	}
	button {
		cursor: pointer;
	}
	.input {
		width: 100%;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: #2b2b3a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
	}
	.actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
	}
</style>
