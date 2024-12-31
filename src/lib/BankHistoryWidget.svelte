<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';
	import SpinnerBar from './SpinnerBar.svelte';
	import BankUTXO from './BankUTXO.svelte';
	import {
		confirmed_interactions,
		mempool_interactions,
		prepared_interactions,
		savePreparedInteractionsToLocalStorage
	} from './stores/preparedInteractions';
	import { fade, fly } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import { applyAnimation, blinkThreeTimes, rejectShake } from './animations';
	import BankUtxoUnconfirmed from './BankUTXOUnconfirmed.svelte';

	let blinkingItems = new Set<string>();
	let removingItems = new Set<string>();

	function handleFlyEnd(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.add(id);
	}

	function handleBlinkEnd(id: string) {
		blinkingItems = new Set(blinkingItems);
		blinkingItems.delete(id);
	}

	async function handleRemoval(id: string) {
		// Mark item for removal and trigger blink animation
		removingItems = new Set(removingItems);
		removingItems.add(id);
		blinkingItems = new Set(blinkingItems);
		blinkingItems.add(id);

		// Wait for blink animation to complete
		await new Promise((resolve) => setTimeout(resolve, 600));

		// Remove the item
		prepared_interactions.update((items) => items.filter((x) => x.id !== id));

		// Cleanup sets
		removingItems = new Set(removingItems);
		removingItems.delete(id);
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
			const currentTime = Date.now();
			$prepared_interactions.forEach((item) => {
				if (item.timestamp < currentTime - 60000 && !removingItems.has(item.id)) {
					handleRemoval(item.id);
				}
			});
			prepared_interactions.set($prepared_interactions);
			mempool_interactions.set($mempool_interactions);
			confirmed_interactions.set($confirmed_interactions);
		}, 1000);

		prepared_interactions.subscribe(() => {
			savePreparedInteractionsToLocalStorage();
		});
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});

	function addDummy() {
		console.log('asdf');
		const x = {
			id: crypto.randomUUID(),
			transactionId: crypto.randomUUID(),
			amount: 123,
			timestamp: Date.now(),
			price: 32.22,
			type: 'BUY',
			ergAmount: 100,
			confirmed: false,
			rejected: false,
			own: false
		};

		prepared_interactions.update((l) => [x, ...l]);

		setTimeout(() => {
			prepared_interactions.update((l) => {
				//l.find((y) => y.id == x.id).rejected = true;
				return l;
			});
		}, 4000);
		setTimeout(() => {
			prepared_interactions.update((l) => l.filter((y) => y.id != x.id));
			confirmed_interactions.update((l) => [x, ...l]);
		}, 3000);
	}
</script>

<div class="widget">
	<div class="pl-2">
		<BankUTXO />
		{#if $mempool_interactions.length > 0 || $prepared_interactions.length > 0}
			<div in:fade={{ duration: 400 }} out:fly={{ y: -20, opacity: 0, duration: 300 }}>
				<BankUtxoUnconfirmed confirmed={false} />
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
					out:applyAnimation={{ interaction: i, duration: 1000 }}
				>
					<div class="left pb-1">
						<div class:blink={!i.rejected && !i.confirmed}>
							<div class="flex items-center gap-1 uppercase text-gray-400">
								{#if i.rejected}
									<svg
										fill="currentColor"
										width="1em"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										><path
											d="M9.172 16.242 12 13.414l2.828 2.828 1.414-1.414L13.414 12l2.828-2.828-1.414-1.414L12 10.586 9.172 7.758 7.758 9.172 10.586 12l-2.828 2.828z"
										/><path
											d="M12 22c5.514 0 10-4.486 10-10S17.514 2 12 2 2 6.486 2 12s4.486 10 10 10zm0-18c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8z"
										/></svg
									>
								{:else if i.confirmed}
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
								{:else}
									<span class="mr-3">
										<SpinnerBar size={2.2} />
									</span>
								{/if}
								<span>{i.type} @{i.price}</span>
							</div>
						</div>
						<span class="text-sm text-gray-500">{formatTimeAgo(i.timestamp)}</span>
					</div>
					<div class="flex flex-col">
						<div>
							<span class="mr-1 text-3xl" class:text-gray-500={!i.own}
								>{formatAmount(i.amount)}</span
							>
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

			{#each $confirmed_interactions as c (c.id)}
				<a href="https://explorer.ergoplatform.com/en/transactions/{c.transactionId}">
					<div class="row text-green-500">
						<div class="left pb-1">
							<div>
								<div class="flex items-center gap-1 uppercase">
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
									{c.type} @{c.price}
								</div>
							</div>
							<span class="text-sm">{formatTimeAgo(c.timestamp)}</span>
						</div>
						<div class="flex flex-col">
							<div>
								<span class="mr-1 text-3xl">
									{formatAmount(c.amount)}
								</span>
								<span class="text-lg"> SigUSD </span>
							</div>
							<div class="pr-8 text-right">
								{formatAmount(c.ergAmount)}
								<span style="margin-left:7px;">ERG</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
		<button on:click={addDummy}>
			<h1 class="mb-2 text-9xl text-gray-700">SigmaUSD</h1>
		</button>
	</div>
</div>

<style>
	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
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
