<script lang="ts">
	import { Socket } from 'phoenix';
	import { onMount } from 'svelte';
	import { mempool_transactions } from './stores/mempoolTranscations';
	import { mempoolDummy } from './mempoolDummy';
	import { updateMempoolInteractions } from './stores/preparedInteractions';

	onMount(() => {
		let x = mempoolDummy;

		// Connect your Phoenix socket
		const socket = new Socket('wss://ergfi.xyz:4004/socket', { params: {} });
		socket.connect();

		// Choose which channel you want (options are "transactions" or "sigmausd_transactions")
		const channelTopic = 'transactions';
		const channel = socket.channel('mempool:' + channelTopic, {});

		// Join the channel
		channel
			.join()
			.receive('ok', (resp) => {
				console.log('Joined successfully:', resp);
				console.log('resp', resp);

				// If your backend returns an initial payload upon joining
				if (resp.unconfirmed_transactions || resp.confirmed_transactions) {
					const merged = mergeUnconfirmedAndConfirmed(resp);
					console.log('Transactions from join response:', merged);
					updateMempoolInteractions(merged);
				}
			})
			.receive('error', (resp) => {
				console.log('Unable to join:', resp);
			});

		// Listen for "all_transactions" broadcasts
		channel.on('all_transactions', (payload) => {
			const merged = mergeUnconfirmedAndConfirmed(payload);
			console.log('All transactions received:', merged);
			updateMempoolInteractions(merged);
		});

		// Listen for the channel’s own topic (e.g., "transactions" or "sigmausd_transactions")
		channel.on(channelTopic, (payload) => {
			const merged = mergeUnconfirmedAndConfirmed(payload);
			console.log(`${channelTopic} received:`, merged);
			updateMempoolInteractions(merged);
		});

		// Cleanup when component unmounts
		return () => {
			channel.leave();
			socket.disconnect();
		};
	});

	/**
	 * Merges unconfirmed and confirmed transactions into one list.
	 * If you’d rather keep them separate, just handle them individually.
	 */
	function mergeUnconfirmedAndConfirmed(payload) {
		const unconfirmed = payload.unconfirmed_transactions ?? [];
		const confirmed = payload.confirmed_transactions ?? [];
		return [...unconfirmed, ...confirmed];
	}
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
