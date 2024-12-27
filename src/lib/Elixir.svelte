<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { mempool_transactions } from './stores/mempoolTranscations';
	import { mempoolDummy } from './mempoolDummy';

	onMount(() => {
		let x = mempoolDummy;
		mempool_transactions.set([x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x]);
		const socket = new Socket('ws://localhost:4000/socket', { params: {} });
		socket.connect();
		//const channelTopic = 'sigmausd_transactions';
		const channelTopic = 'transactions';

		const channel = socket.channel('mempool:' + channelTopic, {});

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
		});

		channel.on(channelTopic, (payload) => {
			console.log(channelTopic, payload);

			if (payload.transactions.length < 1) {
				mempool_transactions.set([x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x]);
			} else {
				mempool_transactions.set(payload.transactions);
				mempool_transactions.set([x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x, x]);
			}
		});

		return () => {
			channel.leave();
			socket.disconnect();
		};
	});
</script>

<h1>SigmaUSD Transactions</h1>
{#if $mempool_transactions.length > 0}
	<ul>
		{#each $mempool_transactions as tx}
			<li><strong>Transaction ID:</strong> {tx.id}</li>
		{/each}
	</ul>
{:else}
	<p>No transactions in the mempool.</p>
{/if}
