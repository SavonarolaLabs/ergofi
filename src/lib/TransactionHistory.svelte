<!-- TransactionHistory.svelte -->

<script lang="ts">
	import {
		transactions,
		totalTransactions,
		currentPage,
		itemsPerPage,
		isLoading,
		error,
		fetchTransactions,
		syncTransactions,
		syncProgress
	} from '$lib/stores/transactionStore';
	import { onMount } from 'svelte';
	import { history } from '../data/history';

	const DUMMY_DATA = true;

	import { SIGUSD_BANK_ADDRESS, TOKEN_SIGRSV, TOKEN_SIGUSD } from '$lib/api/ergoNode';
	import {
		calculateAddressInfo,
		calculateOperationInfo,
		shorten,
		type OperationInfo
	} from './TransactionUtils';

	// Pre-process the transactions when they change
	let processedHistory: any[] = [];

	$: if ($transactions) {
		processedHistory = $transactions
			.map((tx) => {
				if (!tx.inputs || !tx.outputs) return null;

				const bank = calculateAddressInfo(tx, SIGUSD_BANK_ADDRESS);
				const userAddress = tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree;
				const user = calculateAddressInfo(tx, userAddress);
				const txData: OperationInfo = calculateOperationInfo(bank, user);

				return {
					...tx,
					bank,
					user,
					txData,
					shortenedId: shorten(tx.id),
					shortenedAddress: shorten(userAddress),
					formattedTimestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : ''
				};
			})
			.filter(Boolean); // Remove null entries
	}

	onMount(() => {
		if (DUMMY_DATA) {
			processedHistory = history.items
				.map((tx) => {
					if (!tx.inputs || !tx.outputs) return null;

					const bank = calculateAddressInfo(tx, SIGUSD_BANK_ADDRESS);
					const userAddress = tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree;
					const user = calculateAddressInfo(tx, userAddress);
					const txData: OperationInfo = calculateOperationInfo(bank, user);

					return {
						...tx,
						bank,
						user,
						txData,
						shortenedId: shorten(tx.id),
						shortenedAddress: shorten(userAddress),
						formattedTimestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : ''
					};
				})
				.filter(Boolean);
		} else {
			fetchTransactions($currentPage);
			syncTransactions();
		}
	});

	function goToPage(page: number) {
		fetchTransactions(page);
	}

	// Calculate total pages
	$: totalPages = Math.ceil($totalTransactions / $itemsPerPage);
</script>

<!-- TransactionHistory.svelte -->
{#if $isLoading}
	<div class="progress-bar-container">
		<p>Syncing transactions... {$syncProgress} transactions synchronized</p>
	</div>
{/if}

{#if $isLoading}
	<p>Loading transactions...</p>
{:else if $error}
	<p>Error: {$error}</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Timestamp</th>
				<th>Tx ID</th>
				<th>Pair</th>
				<th>Operation</th>
				<th>Amount</th>
				<th>Volume</th>
				<th>Price</th>
				<th>User USD Diff</th>
				<th>User ERG Diff</th>
				<th>Address</th>
			</tr>
		</thead>
		<tbody>
			{#each processedHistory as tx}
				<tr>
					<td>{tx?.formattedTimestamp}</td>
					<td>{tx?.shortenedId}</td>
					<td>{tx?.txData.pair}</td>
					<td>{tx?.txData.operation}</td>
					<td>{tx?.txData.amount}</td>
					<td>{tx?.txData.volume}</td>
					<td>{tx?.txData.priceContract}</td>
					<td>{tx?.user.usdStats?.difference}</td>
					<td>{tx?.user.ergoStats?.difference}</td>
					<td>{tx?.shortenedAddress}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Pagination Controls -->
	<div class="pagination">
		<button on:click={() => goToPage($currentPage - 1)} disabled={$currentPage === 1}>
			Previous
		</button>
		<span>Page {$currentPage} of {totalPages}</span>
		<button on:click={() => goToPage($currentPage + 1)} disabled={$currentPage === totalPages}>
			Next
		</button>
	</div>
{/if}

<style>
	.progress-bar-container {
		width: 100%;
		background-color: #f3f3f3;
		height: 20px;
		margin-bottom: 1em;
		position: relative;
	}

	.progress-bar {
		height: 100%;
		background-color: #4caf50;
		width: 0%;
		transition: width 0.2s;
	}

	.progress-bar-container p {
		position: absolute;
		width: 100%;
		text-align: center;
		margin: 0;
		line-height: 20px;
		color: #000;
		font-size: 14px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}

	th {
		font-weight: bold;
	}

	td {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pagination {
		margin-top: 1em;
		display: flex;
		align-items: center;
	}

	.pagination button {
		padding: 0.5em 1em;
		margin-right: 1em;
	}

	.pagination span {
		font-weight: bold;
	}
</style>
