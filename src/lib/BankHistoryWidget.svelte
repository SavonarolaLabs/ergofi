<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';
	import { exampleTxs } from './sampleTx';
	import {
		calculateAddressInfo,
		calculateOperationInfo,
		centsToUsd,
		nanoErgToErg,
		type OperationInfo
	} from './TransactionUtils';
	import { MINER_TREE, SIGUSD_BANK_TREE } from './api/ergoNode';
	import { bankBoxChains } from './stores/transactions';
	import { ErgoAddress } from '@fleet-sdk/core';
	import { mempool_transactions } from './stores/mempoolTranscations';

	type Interaction = {
		id: string;
		amount: number;
		timestamp: number;
		price: number;
		type: 'Buy' | 'Sell';
		ergAmount: number;
		confirmed: boolean;
	};
	const txes = exampleTxs;

	function txToSigmaUSDInteraction(tx) {
		const bank = calculateAddressInfo(tx, SIGUSD_BANK_TREE);
		const userAddress = tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree;
		const user = calculateAddressInfo(tx, userAddress);
		const miner = calculateAddressInfo(tx, MINER_TREE);

		// const allInputs
		// const allInputsExcept
		// const allOutputs
		// const allOutputsExcept

		const txData: OperationInfo = calculateOperationInfo(bank, user);
		const iteraction = {
			id: '',
			amount: Number(txData.amount.split(' ')[0]),
			timestamp: Date.now(),
			price: Number(txData.price),
			type: txData.operation,
			ergAmount: Number(txData.volume.split(' ')[0]),
			confirmed: false
		};
		return iteraction;
	}

	function makeSimpleParameters(txes: any) {
		const interactions = txes.map(txToSigmaUSDInteraction);

		return interactions;
	}

	const exampleIteraction = makeSimpleParameters(exampleTxs);

	const interactions: Interaction[] = [
		exampleIteraction[0],
		{
			id: 'abc123def',
			amount: 100.5,
			timestamp: Date.now() - 7200000,
			type: 'Sell',
			ergAmount: -50.25,
			price: 2.01,
			confirmed: true
		},
		{
			id: 'Buy',
			amount: -200,
			timestamp: Date.now() - 18000000,
			type: 'Buy',
			ergAmount: 100,
			price: 1.95,
			confirmed: true
		}, // 5 hours ago
		{
			id: 'mno789pqr',
			amount: 150.123,
			timestamp: Date.now() - 86400000,
			type: 'Sell',
			ergAmount: -75.0615,
			price: 2.03,
			confirmed: true
		} // 1 day ago
	];

	const shortTransactionId = (id: string): string => `${id.slice(0, 3)}...${id.slice(-3)}`;
	const formatTimeAgo = (timestamp: number): string => {
		const time = formatDistanceToNowStrict(new Date(timestamp));
		return (
			time
				.replace(/ hours?/, 'h')
				.replace(/ minutes?/, 'm')
				.replace(/ days?/, 'd')
				.replace(/ seconds?/, 's') + ' ago'
		);
	};
	const formatAmount = (amount: number): string => `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
</script>

<div class="widget">
	{#each $mempool_transactions.map(txToSigmaUSDInteraction) as interaction}
		<div class="row">
			<div class="left pb-1">
				<div>
					<div class="flex items-center gap-1 uppercase text-gray-400">
						{#if interaction.confirmed}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 512 512"
								width="1em"
								fill="currentColor"
								style="margin-left:2px;margin-right:2px;"
								><path
									d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"
								/></svg
							>
							{interaction.type} @{interaction.price}
						{:else}
							<Spinner size={16} />
							{interaction.type} @{interaction.price}
						{/if}
					</div>
				</div>
				<span class="text-sm text-gray-500">{formatTimeAgo(interaction.timestamp)}</span>
			</div>
			<div class="flex flex-col">
				<div>
					<span class="mr-1 text-3xl">
						{formatAmount(interaction.amount)}
					</span>
					<span class="text-lg text-gray-500"> SigUSD </span>
				</div>
				<div class="pr-10 text-right text-gray-500">
					{formatAmount(interaction.ergAmount)} <span style="margin-left:7px;">ERG</span>
				</div>
			</div>
		</div>
	{/each}
	<h1 class="mb-2 text-9xl text-gray-700">SigmaUSD</h1>
</div>

<style>
	.widget {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 430px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: end;
		padding: 0.5rem 1rem;
	}
	.left {
		display: flex;
		flex-direction: column;
	}
	.transaction-id {
		cursor: pointer;
		text-decoration: underline;
	}
</style>
