<script lang="ts">
	import Spinner from './Spinner.svelte';
	import SpinnerBar from './SpinnerBar.svelte';
	import BankUTXO from './BankUTXO.svelte';
	import DexyGoldLpUTXO from './DexyGoldLpUTXO.svelte';
	import {
		confirmed_interactions,
		mempool_interactions,
		prepared_interactions,
		saveConfirmedInteractionsToLocalStorage,
		savePreparedInteractionsToLocalStorage
	} from './stores/preparedInteractions';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { applyAnimation } from './animations';
	import BankUtxoUnconfirmed from './BankUTXOUnconfirmed.svelte';
	import { formatTimeAgo } from './utils';
	import CheckCircle from './icons/CheckCircle.svelte';
	import CheckCircleFilled from './icons/CheckCircleFilled.svelte';
	import XCircle from './icons/XCircle.svelte';
	import InteractionAmountColumn from './InteractionAmountColumn.svelte';
	import SubNumber from './SubNumber.svelte';
	import { headline } from './stores/ui';

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

	onMount(() => {
		let intervalId = setInterval(() => {
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
		return () => {
			clearInterval(intervalId);
		};
	});
</script>

<div class="widget text-gray-500">
	<div class="pl-2">
		{#if $headline == 'DexyGold'}
			<DexyGoldLpUTXO></DexyGoldLpUTXO>
		{:else}
			<BankUTXO />
		{/if}
		<!-- {#if $mempool_interactions.length > 0 || $prepared_interactions.length > 0}
			<div in:fade={{ duration: 400 }} out:fly={{ y: -20, opacity: 0, duration: 300 }}>
				<BankUtxoUnconfirmed confirmed={false} />
			</div>
		{/if} -->
	</div>
	<div class="padding-bottom">
		<div class="tx-list w-full pl-2">
			{#each $prepared_interactions as i (i.id)}
				<div
					class="row {blinkingItems.has(i.id) ? 'blink-twice' : ''}"
					class:text-white={i.own}
					in:fly={{ y: -20, opacity: 0, duration: 300 }}
					on:introend={() => handleFlyEnd(i.id)}
					on:animationend={() => handleBlinkEnd(i.id)}
					out:applyAnimation={{ interaction: i, duration: 1000 }}
				>
					<div class="left pb-1">
						<div class:blink={!i.rejected && !i.confirmed}>
							<div class="flex items-center gap-1 uppercase">
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

									@{#if i.amountCurrency == 'SigRSV'}
										<SubNumber value={1 / i.price}></SubNumber>
									{:else}
										<SubNumber value={i.price}></SubNumber>
									{/if}
								</span>
							</div>
						</div>
						<span class="text-sm">{formatTimeAgo(i.timestamp)}</span>
					</div>

					<div class="flex flex-col items-end" class:text-white={i.own}>
						<InteractionAmountColumn {i}></InteractionAmountColumn>
					</div>
				</div>
			{/each}

			{#each $mempool_interactions as m (m.id)}
				<a target="_blank" href="https://sigmaspace.io/en/transaction/{m.transactionId}">
					<div
						class="row"
						class:text-white={m.own}
						out:applyAnimation={{ interaction: m, duration: 1000 }}
					>
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

										@{#if m.amountCurrency == 'SigRSV'}
											<SubNumber value={1 / m.price}></SubNumber>
										{:else}
											<SubNumber value={m.price}></SubNumber>
										{/if}
									{:else}
										<Spinner size={16} />
										{#if m.amountCurrency == 'SigUSD'}
											{m.type == 'Buy' ? 'Sell' : 'Buy'}
										{:else}
											{m.type}
										{/if}
										@{#if m.amountCurrency == 'SigRSV'}
											<SubNumber value={1 / m.price}></SubNumber>
										{:else}
											<SubNumber value={m.price}></SubNumber>
										{/if}
									{/if}
								</div>
							</div>
							<span class="text-sm">{formatTimeAgo(m.timestamp)}</span>
						</div>
						<div class="flex flex-col items-end">
							<InteractionAmountColumn i={m}></InteractionAmountColumn>
						</div>
					</div>
				</a>
			{/each}

			{#each $confirmed_interactions as c (c.id)}
				<a target="_blank" href="https://sigmaspace.io/en/transaction/{c.transactionId}">
					<div class="row" class:text-green-500={c.own}>
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

									@{#if c.amountCurrency == 'SigRSV'}
										<SubNumber value={1 / c.price}></SubNumber>
									{:else}<SubNumber value={c.price}></SubNumber>{/if}
								</div>
							</div>
							<span class="text-sm">{formatTimeAgo(c.timestamp)}</span>
						</div>
						<div class="flex flex-col items-end">
							<InteractionAmountColumn i={c}></InteractionAmountColumn>
						</div>
					</div>
				</a>
			{/each}
		</div>
		<h1 class="punk hidden-below-800 mb-2 text-9xl text-gray-700">{$headline}</h1>
	</div>
</div>

<style>
	.punk {
		font-family: 'Cyberpunk', sans-serif;
	}

	@media (max-height: 800px) {
		.hidden-below-800 {
			display: none;
		}
		.padding-bottom {
			padding-bottom: 15px;
		}
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
