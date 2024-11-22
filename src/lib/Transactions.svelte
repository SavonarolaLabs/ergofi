<!-- src/routes/Transactions.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mempoolSize, maxTxCount, bankBoxChains } from '$lib/stores/transactions';

	let currentMempoolSize = 0;
	let percentageLoaded = 0;

	const unsubscribeMempoolSize = mempoolSize.subscribe((size) => {
		currentMempoolSize = size;
		percentageLoaded = Math.min((size / maxTxCount) * 100, 100);
	});

	let chains = [];
	const unsubscribeChains = bankBoxChains.subscribe((value) => {
		chains = value;
	});

	onDestroy(() => {
		unsubscribeMempoolSize();
		unsubscribeChains();
	});
</script>

<div>
	<h1></h1>
	<div class="progress-bar">
		<div class="progress-bar-inner" style="width: {percentageLoaded}%;"></div>
	</div>
	<p class="progress-text">
		Mempool: {currentMempoolSize} /{maxTxCount}
	</p>
</div>

<!-- Visualize the bank box chains with fixed-height container -->
<div class="transaction-chains-container">
	<div class="transaction-chains">
		{#if chains.length === 0}
			<div class="no-chains-placeholder">
				<p>No transaction chains available</p>
			</div>
		{/if}
		{#each chains as chain}
			<div class="chain">
				{#each chain as item, index}
					{#if item.type === 'box'}
						<div class="box">
							<p><strong>Bank Box ID:</strong> {item.box.boxId}</p>
							<p><strong>Value:</strong> {item.box.value} nanoERG</p>
							<!-- Display box assets -->
							{#if item.box.assets}
								<p><strong>Assets:</strong></p>
								<ul>
									{#each item.box.assets as asset}
										<li>{asset.amount} of {asset.tokenId}</li>
									{/each}
								</ul>
							{/if}
						</div>
					{:else if item.type === 'tx'}
						<div class="arrow">&rarr;</div>
						<div class="transaction {item.isMainBranch ? 'main-branch' : 'conflict-branch'}">
							<p><strong>Transaction ID:</strong> {item.tx.id}</p>
							<p><strong>Fee:</strong> {item.tx.fee}</p>
							{#if !item.isMainBranch}
								<p class="conflict-label">Conflicting Transaction</p>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
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

	.transaction-chains-container {
		margin-top: 20px;
		min-height: 300px; /* Fixed minimum height */
		border: 1px solid #f0f0f0; /* Light border to show container */
	}

	.transaction-chains {
		width: 100%;
	}

	.no-chains-placeholder {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		color: #888;
		font-style: italic;
		padding: 20px;
	}

	.chain {
		display: flex;
		align-items: center;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.box,
	.transaction {
		border: 1px solid #000;
		padding: 10px;
		margin: 5px;
		min-width: 200px;
	}

	.arrow {
		font-size: 24px;
		margin: 0 5px;
	}

	.transaction.main-branch {
		background-color: #e0ffe0;
	}

	.transaction.conflict-branch {
		background-color: #ffe0e0;
	}

	.conflict-label {
		color: red;
		font-weight: bold;
	}
</style>
