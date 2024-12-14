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

	// Constants (replace with your actual values)

	import {
		SIGUSD_BANK_ADDRESS,
		TOKEN_BANK_NFT,
		TOKEN_SIGRSV,
		TOKEN_SIGUSD
	} from '$lib/api/ergoNode';

	interface TokenStats {
		input: number;
		output: number;
		difference: number;
	}

	interface AddressInfo {
		address: string;
		ergoStats?: TokenStats;
		usdStats?: TokenStats;
		rsvStats?: TokenStats;
	}

	interface OperationInfo {
		pair: string;
		operation: string;
		amount: string;
		volume: string;
		priceContract: string | number;
	}

	function calculateTokenStatsByAddress(tx: any, tokenId: string, address: string): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.ergoTree === address)
			.flatMap((input: any) => input.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.ergoTree === address)
			.flatMap((output: any) => output.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		return {
			input: inputAmount,
			output: outputAmount,
			difference: outputAmount - inputAmount
		};
	}

	function calculateAddressInfo(tx: any, address: string): AddressInfo {
		return {
			address: address,
			ergoStats: calculateErgoStatsByAddress(tx, address),
			usdStats: calculateTokenStatsByAddress(tx, TOKEN_SIGUSD, address),
			rsvStats: calculateTokenStatsByAddress(tx, TOKEN_SIGRSV, address)
		};
	}

	function calculateOperationInfo(bank: AddressInfo, user: AddressInfo): OperationInfo {
		let priceErgUsd;
		let priceErgSigRSV;
		let pair;
		let operation;
		let amount;
		let volume;

		if (bank.usdStats?.difference !== 0) {
			pair = 'USD/ERG';
			operation = bank.usdStats!.difference! < 0 ? 'buy' : 'sell';
			amount = -centsToUsd(bank.usdStats!.difference!) + ' USD';
			priceErgUsd = (-(bank.usdStats!.difference! / bank.ergoStats!.difference!) * 10 ** 7).toFixed(
				2
			);
			priceErgSigRSV = 0;
		} else {
			pair = 'RSV/ERG';
			operation = bank.rsvStats!.difference! < 0 ? 'buy' : 'sell';
			amount = -bank.rsvStats!.difference! + ' RSV';
			priceErgSigRSV = (
				-(bank.rsvStats!.difference! / bank.ergoStats!.difference!) *
				10 ** 9
			).toFixed(2);
			priceErgUsd = 0;
		}
		volume = -nanoErgToErg(bank.ergoStats!.difference!) + ' ERG';

		return {
			pair: pair,
			operation: operation,
			amount: amount,
			volume: volume,
			priceContract: pair == 'USD/ERG' ? priceErgUsd : priceErgSigRSV
		};
	}

	function nanoErgToErg(nanoErg: number) {
		return nanoErg ? Number((nanoErg / 10 ** 9).toFixed(2)) : 0;
	}

	function centsToUsd(cents: number) {
		return cents ? Number((cents / 10 ** 2).toFixed(2)) : 0;
	}

	function calculateErgoStatsByAddress(tx: any, address: string): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.ergoTree === address)
			.reduce((sum: number, input: any) => sum + input.value, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.ergoTree === address)
			.reduce((sum: number, output: any) => sum + output.value, 0);

		return {
			input: inputAmount,
			output: outputAmount,
			difference: outputAmount - inputAmount
		};
	}

	function shorten(value: string | undefined): string {
		if (!value) return '';
		return value.length > 6 ? `${value.slice(0, 3)}...${value.slice(-3)}` : value;
	}

	// Pre-process the transactions when they change
	let processedHistory: any[] = [];

	$: if ($transactions) {
		processedHistory = $transactions
			.map((tx) => {
				if (!tx.inputs || !tx.outputs) return null;

				const bank = calculateAddressInfo(tx, SIGUSD_BANK);
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

					const bank = calculateAddressInfo(tx, SIGUSD_BANK);
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
