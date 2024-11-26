<script lang="ts">
	import { history } from '../data/history';
	import { SIGUSD_BANK, TOKEN_SIGRSV, TOKEN_SIGUSD } from './sigmaUSD';

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
		//priceTotal: number;
	}

	function calculateTokenStatsByAddress(tx: any, tokenId: string, address: string): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == address)
			.flatMap((input: any) => input.assets)
			.filter((asset: any) => asset.tokenId === tokenId)
			.reduce((sum: number, asset: any) => sum + asset.amount, 0);

		const outputAmount = tx.outputs
			.filter((input: any) => input.address == address)
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

		if (bank.usdStats.difference != 0) {
			pair = 'USD/ERG';
			operation = bank.usdStats.difference < 0 ? 'buy' : 'sell';
			amount = -centsToUsd(bank.usdStats.difference) + ' USD';
			priceErgUsd = (-(bank.usdStats.difference / bank.ergoStats.difference) * 10 ** 7).toFixed(2);
			priceErgSigRSV = 0;
		} else {
			pair = 'RSV/ERG	';
			operation = bank.rsvStats.difference < 0 ? 'buy' : 'sell';
			amount = -bank.rsvStats.difference + ' RSV';
			priceErgSigRSV = (-(bank.rsvStats.difference / bank.ergoStats.difference) * 10 ** 9).toFixed(
				2
			);
			priceErgUsd = 0;
		}
		volume = -nanoErgToErg(bank.ergoStats.difference) + ' ERG';

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

	function ergToNanoErg(erg: number) {
		return erg ? erg * 10 ** 9 : 0;
	}

	function centsToUsd(cents: number) {
		return cents ? Number((cents / 10 ** 2).toFixed(2)) : 0;
	}

	function usdToCents(usd: number) {
		return usd ? usd * 10 ** 2 : 0;
	}

	function calculateErgoStatsByAddress(tx: any, address: string): TokenStats {
		const inputAmount = tx.inputs
			.filter((input: any) => input.address == address)
			.flatMap((input: any) => input.value)
			.reduce((sum: number, value: any) => sum + value, 0);

		const outputAmount = tx.outputs
			.filter((output: any) => output.address == address)
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

			const bank = calculateAddressInfo(tx, SIGUSD_BANK);
			const user = calculateAddressInfo(tx, tx.outputs[1].address);
			const txData: OperationInfo = calculateOperationInfo(bank, user);

			return {
				...tx,
				bank,
				user,
				txData,
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
			<th>User-USD-DIFF</th>
			<th>User-ERG-DIFF</th>
			<!-- <th>User-RSV-DIFF</th> -->

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
				<!-- <td>{tx.inclusionHeight}</td> -->
				<!-- <td>{centsToUsd(tx.sigUSDStats.input)}</td>
				<td>{centsToUsd(tx.sigUSDStats.output)}</td> -->
				<td>{tx?.txData.amount} </td>
				<!-- <td>{tx.sigRSVStats.input}</td>	
				<td>{tx.sigRSVStats.output}</td> -->
				<!-- <td>{tx.sigRSVStats.difference}</td> -->
				<!-- <td>{nanoErgToErg(tx.ergoStats.input)}</td>
				<td>{nanoErgToErg(tx.ergoStats.output)}</td> -->
				<td>{tx?.txData.volume}</td>
				<td>{tx?.txData.priceContract}</td>
				<td>{tx?.user.usdStats?.difference}</td>
				<td>{tx?.user.ergoStats?.difference}</td>
				<!-- <td>{tx.userRSVStats.difference}</td> -->
				<td>{tx?.shortenedAddress}</td>
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
