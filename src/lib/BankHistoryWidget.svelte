<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';

	import { mempool_transactions } from './stores/mempoolTranscations';
	import { prepared_interactions } from './stores/preparedInteractions';

	import SpinnerBar from './SpinnerBar.svelte';
	import { fly } from 'svelte/transition';
	import { txToSigmaUSDInteraction } from './interaction'; // your custom function
	import { onDestroy, onMount } from 'svelte';

	/**
	 * We maintain a Set of items currently in blink phase.
	 * When fly transition finishes, we add the ID => triggers blink.
	 * When blink animation finishes, we remove the ID => stops blinking.
	 */
	let blinkingItems = new Set<string>();

	/**
	 * Called after the fly transition's `introend`.
	 * We create a NEW Set so Svelte sees the change (reactivity).
	 */
	function handleFlyEnd(interactionId: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.add(interactionId);
	}

	/**
	 * Called when the blink animation finishes.
	 * Removing the ID from the Set ends the blink.
	 */
	function handleBlinkEnd(interactionId: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.delete(interactionId);
	}

	/**
	 * Format a timestamp as "5m ago", "2h ago", etc.
	 */
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

	/**
	 * Show + or - sign plus 2 decimal places
	 */
	function formatAmount(amount: number): string {
		return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
	}

	let intervalId: number;

	onMount(() => {
		intervalId = setInterval(() => {
			prepared_interactions.update((current) => [...current]);
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

<!-- MAIN LAYOUT -->
<div class="widget">
	<div class="tx-list w-full">
		{#each $prepared_interactions as interaction (interaction.id)}
			<!-- 
				1) Fly in from above
				2) on:introend => handleFlyEnd(interaction.id)
				3) .blink-twice if in blinkingItems
				4) on:animationend => handleBlinkEnd(interaction.id)
			-->
			<div
				class="row {blinkingItems.has(interaction.id) ? 'blink-twice' : ''}"
				in:fly={{ y: -20, opacity: 0, duration: 300 }}
				on:introend={() => handleFlyEnd(interaction.id)}
				on:animationend={() => handleBlinkEnd(interaction.id)}
			>
				<div class="left pb-1">
					<div class="blink">
						<div class="flex items-center gap-1 uppercase text-gray-400">
							<SpinnerBar size={2.2} />
							<span class=" ml-3">{interaction.type} @{interaction.price}</span>
						</div>
					</div>
					<span class="text-sm text-gray-500">
						{formatTimeAgo(interaction.timestamp)}
					</span>
				</div>
				<div class="flex flex-col">
					<div>
						<span class="mr-1 text-3xl">
							{formatAmount(interaction.amount)}
						</span>
						<span class="text-lg text-gray-500"> SigUSD </span>
					</div>
					<div class="pr-10 text-right text-gray-500">
						{formatAmount(interaction.ergAmount)}
						<span style="margin-left:7px;">ERG</span>
					</div>
				</div>
			</div>
		{/each}

		{#each $mempool_transactions.map(txToSigmaUSDInteraction) as interaction (interaction.id)}
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
					<span class="text-sm text-gray-500">
						{formatTimeAgo(interaction.timestamp)}
					</span>
				</div>
				<div class="flex flex-col">
					<div>
						<span class="mr-1 text-3xl">
							{formatAmount(interaction.amount)}
						</span>
						<span class="text-lg text-gray-500"> SigUSD </span>
					</div>
					<div class="pr-10 text-right text-gray-500">
						{formatAmount(interaction.ergAmount)}
						<span style="margin-left:7px;">ERG</span>
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

	/* 
	 Two-blink animation after 'fly' finishes.
	 Duration: 1s, you can tweak it. 
	 The animation ends => triggers on:animationend => handleBlinkEnd()
	*/
	.blink-twice {
		animation: doubleBlink 0.6s ease-in-out forwards;
	}

	@keyframes doubleBlink {
		0%,
		100% {
			opacity: 1;
		}
		25%,
		75% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}
</style>
