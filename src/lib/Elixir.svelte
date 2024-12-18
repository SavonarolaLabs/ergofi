<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const transactions = writable([]);
	const bankBoxChains = writable([]);

	onMount(() => {
		const socket = new Socket('ws://localhost:4000/socket', { params: {} });
		socket.connect();

		const channel = socket.channel('mempool:sigmausd_transactions', {});

		channel
			.join()
			.receive('ok', (resp) => {
				console.log('Joined successfully', resp);
			})
			.receive('error', (resp) => {
				console.log('Unable to join', resp);
			});

		channel.on('all_transactions', (payload) => {
			console.log('all_transactions', { payload });
			transactions.set(payload.transactions);
		});

		channel.on('sigmausd_transactions', (payload) => {
			console.log('sigmausd_transactions', payload);
			transactions.set(payload.transactions);
		});

		return () => {
			channel.leave();
			socket.disconnect();
		};
	});
</script>

<h1>SigmaUSD Transactions</h1>
{#if $transactions.length > 0}
	<ul>
		{#each $transactions as tx}
			<li><strong>Transaction ID:</strong> {tx.id}</li>
		{/each}
	</ul>
{:else}
	<p>No transactions in the mempool.</p>
{/if}
