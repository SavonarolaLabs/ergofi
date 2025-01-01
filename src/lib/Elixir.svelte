<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { mempoolDummy } from './mempoolDummy';
	import {
		handleMempoolSocketUpdate,
		mempool_interactions,
		updateMempoolInteractions
	} from './stores/preparedInteractions';

	onMount(() => {
		let x = mempoolDummy;

		// Connect your Phoenix socket
		const socket = new Socket('wss://ergfi.xyz:4004/socket', { params: {} });
		socket.connect();

		// Choose which channel you want (options are "transactions" or "sigmausd_transactions")
		const channelTopic = 'sigmausd_transactions';
		const channelName = `mempool:${channelTopic}`;
		const channel = socket.channel(channelName, {});

		// Join the channel
		channel
			.join()
			.receive('ok', (resp) => {
				console.log(`Joined successfully ${channelName}`);
				updateMempoolInteractions(resp.unconfirmed_transactions);
			})
			.receive('error', (resp) => {
				console.log('Unable to join:', resp);
			});

		// channel.on('all_transactions', (payload) => {
		// 	handleMempoolSocketUpdate(payload);
		// });
		channel.on(channelTopic, (payload) => {
			handleMempoolSocketUpdate(payload);
		});

		// Cleanup when component unmounts
		return () => {
			channel.leave();
			socket.disconnect();
		};
	});
</script>

<div style="display:none">
	<h1>SigmaUSD Transactions</h1>
	{#if $mempool_interactions.length > 0}
		<ul>
			{#each $mempool_interactions as tx}
				<li><strong>Transaction ID:</strong> {tx.transactionId}</li>
			{/each}
		</ul>
	{:else}
		<p>No transactions in the mempool.</p>
	{/if}
</div>
