<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const allTransactions = writable([]);
	const bankBoxChains = writable([]);

	onMount(() => {
		return;
		const socket = new Socket('ws://localhost:4000/socket', { params: {} });
		socket.connect();

		const channel = socket.channel('mempool:transactions', {});

		channel
			.join()
			.receive('ok', (resp) => {
				console.log('Joined successfully', resp);
			})
			.receive('error', (resp) => {
				console.log('Unable to join', resp);
			});

		channel.on('all_transactions', (payload) => {
			console.log(payload.transactions[0]);
			allTransactions.set(payload.transactions);
		});

		channel.on('bank_box_chains', (payload) => {
			bankBoxChains.set(payload.chains);
		});

		return () => {
			channel.leave();
			socket.disconnect();
		};
	});
</script>

<h1>All Transactions</h1>
{#if $allTransactions.length > 0}
	<ul>
		{#each $allTransactions as tx}
			<li><strong>Transaction ID:</strong> {tx.id}</li>
		{/each}
	</ul>
{:else}
	<p>No transactions in the mempool.</p>
{/if}

<h1>Bank Box Chains</h1>
{#if $bankBoxChains.length > 0}
	{#each $bankBoxChains as chain, index}
		<div>
			<h2>Chain {index + 1}:</h2>
			<ul>
				{#each chain as item}
					<li>
						{#if item.type === 'box'}
							<strong>Box ID:</strong> {item.box.boxId}
						{:else if item.type === 'tx'}
							<strong>Transaction ID:</strong>
							{item.tx.id} (Main Branch: {item.isMainBranch ? 'Yes' : 'No'})
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
{:else}
	<p>No bank box chains yet.</p>
{/if}
