<script lang="ts">
	import { formatDistanceToNowStrict } from 'date-fns';
	import Spinner from './Spinner.svelte';
	import SpinnerBar from './SpinnerBar.svelte';
	import BankUTXO from './BankUTXO.svelte';
	import {
		confirmed_interactions,
		mempool_interactions,
		prepared_interactions,
		saveConfirmedInteractionsToLocalStorage,
		savePreparedInteractionsToLocalStorage
	} from './stores/preparedInteractions';
	import { fade, fly } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import { applyAnimation } from './animations';
	import BankUtxoUnconfirmed from './BankUTXOUnconfirmed.svelte';
	import numeral from 'numeral';
	import { formatAmount, formatTimeAgo } from './utils';
	import CheckCircle from './icons/CheckCircle.svelte';
	import CheckCircleFilled from './icons/CheckCircleFilled.svelte';
	import XCircle from './icons/XCircle.svelte';

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
		confirmed_interactions.subscribe(() => {
			saveConfirmedInteractionsToLocalStorage();
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
			amountCurrency: 'SigUSD',
			timestamp: Date.now(),
			price: 32.22,
			type: 'Buy',
			ergAmount: -100,
			confirmed: false,
			rejected: false,
			own: false
		};

		mempool_interactions.update((l) => [x, ...l]);

		setTimeout(() => {
			mempool_interactions.update((l) => {
				l.find((y) => y.id == x.id).confirmed = true;
				//l.find((y) => y.id == x.id).rejected = true;
				return l;
			});
		}, 2000);
		setTimeout(() => {
			mempool_interactions.update((l) => l.filter((y) => y.id != x.id));
		}, 2500);
		setTimeout(() => {
			confirmed_interactions.update((l) => [x, ...l].slice(0, 3));
		}, 3600);
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
					class="row text-gray-400 {blinkingItems.has(i.id) ? 'blink-twice' : ''}"
					in:fly={{ y: -20, opacity: 0, duration: 300 }}
					on:introend={() => handleFlyEnd(i.id)}
					on:animationend={() => handleBlinkEnd(i.id)}
					out:applyAnimation={{ interaction: i, duration: 1000 }}
				>
					<div class="left pb-1">
						<div class:blink={!i.rejected && !i.confirmed}>
							<div class="flex items-center gap-1 text-gray-400">
								{#if i.rejected}
									<XCircle></XCircle>
								{:else if i.confirmed}
									{#if i.own}
										<CheckCircleFilled></CheckCircleFilled>
									{:else}
										<CheckCircle></CheckCircle>
									{/if}
								{:else}
									<span class="mr-3">
										<SpinnerBar size={2.2} />
									</span>
								{/if}
								<span>
									{#if i.amountCurrency == 'SigUSD'}
										{i.type == 'Buy' ? 'Sell' : 'Buy'}
									{:else}
										{i.type}
									{/if}
									@{i.price}</span
								>
							</div>
						</div>
						<span class="text-sm">{formatTimeAgo(i.timestamp)}</span>
					</div>
					<div class="flex flex-col items-end" class:text-white={i.own}>
						{#if i.amountCurrency == 'SigUSD'}
							<div>
								<span class="mr-1 text-3xl">
									{formatAmount(i.ergAmount)}
								</span>
								<span class="text-lg" style="padding-right:22px;">ERG</span>
							</div>
							<div class="text-right">
								{formatAmount(i.amount)}
								<span style="margin-left:5px;">{i.amountCurrency}</span>
							</div>
						{:else}
							<div>
								<span class="mr-1 text-3xl">{formatAmount(i.amount)}</span>
								<span class="text-lg"> {i.amountCurrency} </span>
							</div>
							<div class="text-right">
								{formatAmount(i.ergAmount)}
								<span style="margin-left:5px; padding-right:30px;">ERG</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			{#each $mempool_interactions as m (m.id)}
				<a href="https://sigmaverse.io/en/transactions/{m.transactionId}">
					<div class="row text-gray-500" out:applyAnimation={{ interaction: m, duration: 1000 }}>
						<div class="left pb-1">
							<div>
								<div class="flex items-center gap-1 uppercase">
									{#if m.rejected}
										<XCircle></XCircle>
									{:else if m.confirmed}
										{#if m.own}
											<CheckCircleFilled></CheckCircleFilled>
										{:else}
											<CheckCircle></CheckCircle>
										{/if}
										{#if m.amountCurrency == 'SigUSD'}
											{m.type == 'Buy' ? 'Sell' : 'Buy'}
										{:else}
											{m.type}
										{/if}

										@{m.price}
									{:else}
										<Spinner size={16} />
										{#if m.amountCurrency == 'SigUSD'}
											{m.type == 'Buy' ? 'Sell' : 'Buy'}
										{:else}
											{m.type}
										{/if}
										@{m.price}
									{/if}
								</div>
							</div>
							<span class="text-sm">{formatTimeAgo(m.timestamp)}</span>
						</div>
						<div class="flex flex-col items-end" class:text-white={m.own}>
							{#if m.amountCurrency == 'SigUSD'}
								<div>
									<span class="mr-1 text-3xl">
										{formatAmount(m.ergAmount)}
									</span>
									<span class="text-lg" style="padding-right:22px;">ERG</span>
								</div>
								<div class="text-right">
									{formatAmount(m.amount)}
									<span style="margin-left:5px;">{m.amountCurrency}</span>
								</div>
							{:else}
								<div>
									<span class="mr-1 text-3xl">{formatAmount(m.amount)}</span>
									<span class="text-lg"> {m.amountCurrency} </span>
								</div>
								<div class="text-right">
									{formatAmount(m.ergAmount)}
									<span style="margin-left:5px; padding-right:30px;">ERG</span>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}

			{#each $confirmed_interactions as c (c.id)}
				<a href="https://sigmaverse.io/en/transactions/{c.transactionId}">
					<div class="row text-green-500">
						<div class="left pb-1">
							<div>
								<div class="flex items-center gap-1 uppercase">
									{#if c.own}
										<CheckCircleFilled></CheckCircleFilled>
									{:else}
										<CheckCircle></CheckCircle>
									{/if}

									{#if c.amountCurrency == 'SigUSD'}
										{c.type == 'Buy' ? 'Sell' : 'Buy'}
									{:else}
										{c.type}
									{/if}

									@{c.price}
								</div>
							</div>
							<span class="text-sm">{formatTimeAgo(c.timestamp)}</span>
						</div>
						<div class="flex flex-col items-end">
							{#if c.amountCurrency == 'SigUSD'}
								<div>
									<span class="mr-1 text-3xl">
										{formatAmount(c.ergAmount)}
									</span>
									<span class="text-lg" style="padding-right:22px;">ERG</span>
								</div>
								<div class="text-right">
									{formatAmount(c.amount)}
									<span style="margin-left:5px;">{c.amountCurrency}</span>
								</div>
							{:else}
								<div>
									<span class="mr-1 text-3xl">
										{formatAmount(c.amount)}
									</span>
									<span class="text-lg"> {c.amountCurrency} </span>
								</div>
								<div class="text-right">
									{formatAmount(c.ergAmount)}
									<span style="margin-left:5px; padding-right:30px;">ERG</span>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
		<button on:click={addDummy}>
			<h1 class="punk mb-2 text-9xl text-gray-700">SigmaUSD</h1>
		</button>
	</div>
</div>

<style>
	.punk {
		font-family: 'Cyberpunk', sans-serif;
	}

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
