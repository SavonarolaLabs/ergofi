<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';
	import SpinnerBar from './SpinnerBar.svelte';
	import BankUTXO from './BankUTXO.svelte';
	import {
		mempool_interactions,
		prepared_interactions,
		savePreparedInteractionsToLocalStorage
	} from './stores/preparedInteractions';
	import { fade, fly } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';

	let blinkingItems = new Set<string>();

	function handleFlyEnd(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.add(id);
	}

	function handleBlinkEnd(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.delete(id);
	}

	function handleOutroStart(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.add(id);
	}

	function handleOutroEnd(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.delete(id);
	}

	function formatTimeAgo(timestamp: number): string {
		const t = formatDistanceToNowStrict(new Date(timestamp));
		return (
			t
				.replace(/ hours?/, 'h')
				.replace(/ minutes?/, 'm')
				.replace(/ days?/, 'd')
				.replace(/ seconds?/, 's') + ' ago'
		);
	}

	function formatAmount(a: number): string {
		return `${a > 0 ? '+' : ''}${a.toFixed(2)}`;
	}

	let intervalId: number;

	onMount(() => {
		intervalId = setInterval(() => {
			prepared_interactions.update((c) => c.filter((x) => x.timestamp >= Date.now() - 60000));
			mempool_interactions.set($mempool_interactions);
		}, 1000);
		prepared_interactions.subscribe(() => {
			savePreparedInteractionsToLocalStorage();
		});
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

<div class="widget">
	<div class="pl-2">
		<BankUTXO />
		{#if $mempool_interactions.length > 0 || $prepared_interactions.length > 0}
			<div in:fade={{ duration: 400 }} out:fly={{ y: -20, opacity: 0, duration: 300 }}>
				<BankUTXO confirmed={false} />
			</div>
		{/if}
	</div>
	<div>
		<div class="tx-list w-full pl-2">
			{#each $prepared_interactions as i (i.id)}
				<div
					class="row {blinkingItems.has(i.id) ? 'blink-twice' : ''}"
					in:fly={{ y: -20, opacity: 0, duration: 300 }}
					on:introend={() => handleFlyEnd(i.id)}
					on:animationend={() => handleBlinkEnd(i.id)}
					out:fly={{ y: 0, opacity: 1, duration: 300 }}
					on:outrostart={() => handleOutroStart(i.id)}
					on:outroend={() => handleOutroEnd(i.id)}
				>
					<div class="left pb-1">
						<div class="blink">
							<div class="flex items-center gap-1 uppercase text-gray-400">
								<SpinnerBar size={2.2} />
								<span class="ml-3">{i.type} @{i.price}</span>
							</div>
						</div>
						<span class="text-sm text-gray-500">{formatTimeAgo(i.timestamp)}</span>
					</div>
					<div class="flex flex-col">
						<div>
							<span class="mr-1 text-3xl">{formatAmount(i.amount)}</span>
							<span class="text-lg text-gray-500"> SigUSD </span>
						</div>
						<div class="pr-8 text-right text-gray-500">
							{formatAmount(i.ergAmount)}
							<span style="margin-left:7px;">ERG</span>
						</div>
					</div>
				</div>
			{/each}

			{#each $mempool_interactions as m (m.id)}
				<a href="https://explorer.ergoplatform.com/en/transactions/{m.transactionId}">
					<div class="row">
						<div class="left pb-1">
							<div>
								<div class="flex items-center gap-1 uppercase text-gray-400">
									{#if m.confirmed}
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
										{m.type} @{m.price}
									{:else}
										<Spinner size={16} />
										{m.type} @{m.price}
									{/if}
								</div>
							</div>
							<span class="text-sm text-gray-500">{formatTimeAgo(m.timestamp)}</span>
						</div>
						<div class="flex flex-col">
							<div>
								<span class="mr-1 text-3xl" class:text-gray-500={!m.own}
									>{formatAmount(m.amount)}</span
								>
								<span class="text-lg text-gray-500"> SigUSD </span>
							</div>
							<div class="pr-8 text-right text-gray-500">
								{formatAmount(m.ergAmount)}
								<span style="margin-left:7px;">ERG</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
		<h1 class="mb-2 text-9xl text-gray-700">SigmaUSD</h1>
	</div>
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
	.tx-list {
		overflow-y: auto;
		max-height: calc(100vh - 368px);
	}
	.widget {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
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
