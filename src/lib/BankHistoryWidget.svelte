<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';

	type Interaction = {
		id: string;
		amount: number;
		timestamp: number;
		price: number;
		type: 'Buy' | 'Sell';
		ergAmount: number;
	};

	const interactions: Interaction[] = [
		{
			id: 'abc123def',
			amount: 100.5,
			timestamp: Date.now() - 7200000,
			type: 'Sell',
			ergAmount: -50.25,
			price: 2.01
		},
		{
			id: 'Buy',
			amount: -200,
			timestamp: Date.now() - 18000000,
			type: 'Buy',
			ergAmount: 100,
			price: 1.95
		}, // 5 hours ago
		{
			id: 'mno789pqr',
			amount: 150.123,
			timestamp: Date.now() - 86400000,
			type: 'Sell',
			ergAmount: -75.0615,
			price: 2.03
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
	{#each interactions as interaction}
		<div class="row">
			<div class="left pb-1">
				<div>
					<div class="uppercase text-gray-400">{interaction.type} @{interaction.price}</div>
				</div>
				<span class="text-sm text-gray-500">{formatTimeAgo(interaction.timestamp)}</span>
			</div>
			<div class="flex flex-col">
				<div>
					<span class="mr-1 text-3xl font-light">
						{formatAmount(interaction.amount)}
					</span>
					<span class="text-lg font-light text-gray-500"> SigUSD </span>
				</div>
				<div class="pr-9 text-right text-gray-500">
					{formatAmount(interaction.ergAmount)}&nbsp&nbsp&nbspERG
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
		width: 400px;
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
