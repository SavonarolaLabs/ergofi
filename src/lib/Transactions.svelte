<!-- src/routes/Transactions.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { transactions, mempoolSize, maxTxCount } from '$lib/stores/transactions';

	let currentMempoolSize = 0;
	let percentageLoaded = 0;

	const unsubscribe = mempoolSize.subscribe((size) => {
		currentMempoolSize = size;
		percentageLoaded = Math.min((size / maxTxCount) * 100, 100);
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<div>
	<h1>Mempool Transactions</h1>
	<p>Current Number of Transactions: {currentMempoolSize}</p>
	<div class="progress-bar">
		<div class="progress-bar-inner" style="width: {percentageLoaded}%;"></div>
	</div>
	<p class="progress-text">{percentageLoaded.toFixed(2)}% of max transactions ({maxTxCount})</p>
</div>

<style>
	.progress-bar {
		background-color: #ccc;
		width: 100%;
		height: 20px;
		border: 1px solid #000;
		position: relative;
		margin-top: 10px;
	}

	.progress-bar-inner {
		background-color: #4caf50;
		height: 100%;
		width: 0%;
		transition: width 0.5s ease;
	}

	.progress-text {
		margin-top: 5px;
		font-weight: bold;
	}
</style>
