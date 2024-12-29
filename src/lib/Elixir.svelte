<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { mempool_transactions } from './stores/mempoolTranscations';
	import { mempoolDummy } from './mempoolDummy';
	import { updateMempoolInteractions } from './stores/preparedInteractions';

	onMount(() => {
		let x = mempoolDummy;
		const socket = new Socket('ws://localhost:4000/socket', { params: {} });
		socket.connect();
		const channelTopic = 'sigmausd_transactions';
		//const channelTopic = 'transactions';

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
			updateMempoolInteractions(payload.transactions);
		});

		channel.on(channelTopic, (payload) => {
			updateMempoolInteractions(payload.transactions);
		});

		return () => {
			channel.leave();
			socket.disconnect();
		};
	});
</script>

<div style="display:none">
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

</div>