<script lang="ts">
	type Currency = 'ERG' | 'SigUSD';

	let fromAmount = '';
	let toAmount = '';
	let selectedCurrency: Currency = 'ERG';

	const currencies: Currency[] = ['ERG', 'SigUSD'];

	function handleCurrencyChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCurrency = target.value as Currency;
	}

	$: toToken = selectedCurrency === 'ERG' ? 'SigUSD' : 'ERG';
	$: tokenColor = {
		ERG: 'bg-orange-500',
		SigUSD: 'bg-green-500'
	};
</script>

<div class="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow dark:bg-gray-800">
	<!-- From Input -->
	<div class="relative mb-8 rounded-md dark:bg-gray-900">
		<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
			<span class="text-sm text-gray-500 dark:text-gray-400">From</span>
			<span class="text-sm text-gray-500 dark:text-gray-400">Balance: 0.0</span>
		</div>
		<div
			class="flex items-center rounded-lg bg-gray-50 pl-1 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
		>
			<input
				type="number"
				bind:value={fromAmount}
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
			<span class="text-sm text-gray-500 dark:text-gray-400">Price: 0.0</span>
		</div>
		<div
			class="flex items-center rounded-lg bg-gray-50 p-3 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-gray-900"
		>
			<input
				type="number"
				bind:value={toAmount}
				class="w-full bg-transparent text-3xl text-gray-900 outline-none dark:text-gray-100"
				placeholder="0"
				min="0"
			/>
			<div
				style="margin-right:-4px; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px"
				class="broder relative flex w-72 items-center gap-2 rounded-lg border-gray-800 bg-white px-3 py-2 dark:bg-gray-900"
			>
				<div class="h-5 w-5 {tokenColor[toToken]} rounded-full" />
				<span class="font-medium text-gray-900 dark:text-gray-100">{toToken}</span>
			</div>
		</div>
	</div>

	<div class="my-4 flex w-full justify-end pr-4 text-blue-500">Fee Settings</div>
	<!-- Swap Button -->
	<button
		class="w-full rounded-lg bg-orange-500 py-3 font-medium text-black text-white hover:bg-orange-600 hover:text-white dark:bg-orange-600 dark:hover:bg-orange-700"
	>
		Swap
	</button>
</div>
