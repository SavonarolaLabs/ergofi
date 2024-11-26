<script lang="ts">
	import { history } from '../data/history';
	import { TOKEN_SIGRSV, TOKEN_SIGUSD } from './sigmaUSD';

	interface TokenStats {
		input: number;
		output: number;
		difference: number;
	}

	function calculateTokenStats(tx: any, tokenId: string): TokenStats {
		const inputAmount = tx.inputs
			.flatMap((input: any) => input.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		const outputAmount = tx.outputs
			.flatMap((output: any) => output.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

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

	// Pre-process the history items to avoid async issues
	const processedHistory = history.items
		.map((tx) => {
			if (!tx.inputs || !tx.outputs) return null;

			const sigUSDStats = calculateTokenStats(tx, TOKEN_SIGUSD);
			const sigRSVStats = calculateTokenStats(tx, TOKEN_SIGRSV);

			return {
				...tx,
				sigUSDStats,
				sigRSVStats,
				shortenedId: shorten(tx.id),
				shortenedAddress: shorten(tx.inputs[0]?.address),
				formattedTimestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : ''
			};
		})
		.filter(Boolean); // Remove null entries
</script>

<table>
	<thead>
		<tr>
			<th>Tx ID</th>
			<th>Inclusion Height</th>
			<th>Timestamp</th>
			<th>Address</th>
			<th>SIGUSD Input</th>
			<th>SIGUSD Output</th>
			<th>SIGUSD Diff</th>
			<th>SIGRSV Input</th>
			<th>SIGRSV Output</th>
			<th>SIGRSV Diff</th>
		</tr>
	</thead>
	<tbody>
		{#each processedHistory as tx}
			<tr>
				<td>{tx.shortenedId}</td>
				<td>{tx.inclusionHeight}</td>
				<td>{tx.formattedTimestamp}</td>
				<td>{tx.shortenedAddress}</td>
				<td>{tx.sigUSDStats.input}</td>
				<td>{tx.sigUSDStats.output}</td>
				<td>{tx.sigUSDStats.difference}</td>
				<td>{tx.sigRSVStats.input}</td>
				<td>{tx.sigRSVStats.output}</td>
				<td>{tx.sigRSVStats.difference}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
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
</style>
