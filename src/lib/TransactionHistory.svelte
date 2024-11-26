<script lang="ts">
	import { history } from '../data/history';
	import { SIGUSD_BANK, TOKEN_SIGRSV, TOKEN_SIGUSD } from './sigmaUSD';

	interface TokenStats {
		input: number;
		output: number;
		difference: number;
	}

	function calculateTokenStats(tx: any, tokenId: string): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == SIGUSD_BANK)
			.flatMap((input: any) => input.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		const outputAmount = tx.outputs
			.filter((input: any) => input.address == SIGUSD_BANK)
			.flatMap((output: any) => output.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		return {
			input: inputAmount,
			output: outputAmount,
			difference: outputAmount - inputAmount
		};
	}

	function nanoErgToErg(nanoErg: number) {
		return nanoErg ? Number((nanoErg / 10 ** 9).toFixed(2)) : 0;
	}
	function ergToNanoErg(erg: number) {
		return erg ? erg * 10 ** 9 : 0;
	}

	function centsToUsd(cents: number) {
		return cents ? Number((cents / 10 ** 2).toFixed(2)) : 0;
	}
	function usdToCents(usd: number) {
		return usd ? usd * 10 ** 2 : 0;
	}

	function calculateErgoStats(tx: any): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == SIGUSD_BANK)
			.flatMap((input: any) => input.value)
			.reduce((sum: number, value: any) => sum + value, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.address == SIGUSD_BANK)
			.flatMap((output: any) => output.value)
			.reduce((sum: number, value: any) => sum + value, 0);

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
			const ergoStats = calculateErgoStats(tx);
			let priceErgUsd;
			let priceErgSigRSV;
			let pair;
			let operation;
			let amount;
			let volume;

			if (ergoStats.difference != 0 && sigUSDStats.difference != 0) {
				priceErgUsd = (-(sigUSDStats.difference / ergoStats.difference) * 10 ** 7).toFixed(2);
			} else {
				priceErgUsd = 0;
			}

			if (ergoStats.difference != 0 && sigRSVStats.difference != 0) {
				priceErgSigRSV = (-(sigRSVStats.difference / ergoStats.difference) * 10 ** 9).toFixed(2);
			} else {
				priceErgSigRSV = 0;
			}

			if (sigUSDStats.difference != 0) {
				pair = 'USD/ERG';
				operation = sigUSDStats.difference < 0 ? 'buy' : 'sell';
				amount = -sigUSDStats.difference + ' USD';
			} else {
				pair = 'RSV/ERG	';
				operation = sigRSVStats.difference < 0 ? 'buy' : 'sell';
				amount = -sigRSVStats.difference + ' RSV';
			}
			volume = -nanoErgToErg(ergoStats.difference) + ' ERG';

			return {
				...tx,
				sigUSDStats,
				sigRSVStats,
				ergoStats,
				priceErgUsd,
				pair,
				amount,
				operation,
				volume,
				priceErgSigRSV,
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
			<th>Timestamp</th>
			<th>Tx ID</th>
			<th>Pair</th>
			<th>Operation</th>
			<!-- <th>Inclusion Height</th> -->
			<!-- <th>SIGUSD Input</th>
			<th>SIGUSD Output</th> -->
			<th>Amount</th>
			<!-- <th>SIGRSV Input</th>
			<th>SIGRSV Output</th> -->
			<!-- <th>SIGRSV Diff</th> -->
			<!-- <th>ERGO Input</th> -->
			<!-- <th>ERGO Output</th> -->
			<th>Volume</th>
			<th>Price</th>
			<th>Address</th>
		</tr>
	</thead>
	<tbody>
		{#each processedHistory as tx}
			<tr>
				<td>{tx.formattedTimestamp}</td>
				<td>{tx.shortenedId}</td>
				<td>{tx.pair}</td>
				<td>{tx?.operation}</td>
				<!-- <td>{tx.inclusionHeight}</td> -->
				<!-- <td>{centsToUsd(tx.sigUSDStats.input)}</td>
				<td>{centsToUsd(tx.sigUSDStats.output)}</td> -->
				<td>{tx.amount} </td>
				<!-- <td>{tx.sigRSVStats.input}</td>	
				<td>{tx.sigRSVStats.output}</td> -->
				<!-- <td>{tx.sigRSVStats.difference}</td> -->
				<!-- <td>{nanoErgToErg(tx.ergoStats.input)}</td>
				<td>{nanoErgToErg(tx.ergoStats.output)}</td> -->
				<td>{tx.volume}</td>
				<td>{tx.pair == 'USD/ERG' ? tx?.priceErgUsd : tx?.priceErgSigRSV}</td>

				<td>{tx.shortenedAddress}</td>
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
