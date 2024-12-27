<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';

	import { mempool_transactions } from './stores/mempoolTranscations';
	import SpinnerBar from './SpinnerBar.svelte';
	import { fly } from 'svelte/transition';
	import { txToSigmaUSDInteraction } from './interaction';
	import { prepared_interactions } from './stores/preparedInteractions';

	function formatTimeAgo(timestamp: number): string {
		const time = formatDistanceToNowStrict(new Date(timestamp));
		return (
			time
				.replace(/ hours?/, 'h')
				.replace(/ minutes?/, 'm')
				.replace(/ days?/, 'd')
				.replace(/ seconds?/, 's') + ' ago'
		);
	}
	function formatAmount(amount: number): string {
		return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
	}
</script>

<div class="widget">
	<div class="tx-list w-full">
		{#each $prepared_interactions as interaction (interaction.id)}
			<!-- negative y so it appears to drop in from above -->
			<div class="row" transition:fly={{ y: -20, opacity: 0, duration: 300 }}>
				<div class="left pb-1">
					<div>
						<div class="flex items-center gap-1 uppercase text-gray-400">
							<SpinnerBar size={2.2} />
							<span class="blink ml-6">{interaction.type} @{interaction.price}</span>
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

		{#each $mempool_transactions.map(txToSigmaUSDInteraction) as interaction (interaction.id)}
			<!-- Keep mempool rows without fly to preserve layout/order -->
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
								>
									<path
										d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"
									/>
								</svg>
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
	</div>
	<h1 class="mb-2 text-9xl text-gray-700">SigmaUSD</h1>
</div>

<style>
	.blink {
		display: inline-block;
		animation: heartbeat 1.5s ease-in-out infinite;
	}
	@keyframes heartbeat {
		0%,
		100% {
			opacity: 1;
		}
		30% {
			opacity: 0.3;
		}
		40% {
			opacity: 1;
		}
		70% {
			opacity: 0.3;
		}
	}
	.tx-list {
		overflow-y: auto;
		max-height: calc(100vh - 288px);
	}
	.widget {
		display: flex;
		flex-direction: column;
		justify-content: end;
		gap: 1rem;
		width: 430px;
		height: 100%;
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
</style>
