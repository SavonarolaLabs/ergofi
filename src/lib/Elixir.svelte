<script lang="ts">
	import { onMount } from 'svelte';
	import { Socket } from 'phoenix';
	import { handleMempoolSocketUpdate, initHistory } from './stores/preparedInteractions';

	onMount(() => {
		const socket = new Socket('wss://ergfi.xyz:4004/socket', { params: {} });
		socket.connect();

		// Handle sigmausd_transactions channel
		const sigmausdChannelTopic = 'sigmausd_transactions';
		const sigmausdChannelName = `mempool:${sigmausdChannelTopic}`;
		const sigmausdChannel = socket.channel(sigmausdChannelName, {});

		sigmausdChannel
			.join()
			.receive('ok', (resp) => {
				console.log(`Joined successfully ${sigmausdChannelName}`);
				initHistory(resp.history);
				console.log('sigmausd_transactions:', resp.history);
				handleMempoolSocketUpdate(resp);
			})
			.receive('error', (resp) => {
				console.error('Unable to join sigmausd_transactions:', resp);
			});

		sigmausdChannel.on(sigmausdChannelTopic, (payload) => {
			handleMempoolSocketUpdate(payload);
		});

		// Handle oracle_boxes channel
		const oracleBoxesChannelTopic = 'oracle_boxes';
		const oracleBoxesChannelName = `mempool:${oracleBoxesChannelTopic}`;
		const oracleBoxesChannel = socket.channel(oracleBoxesChannelName, {});

		oracleBoxesChannel
			.join()
			.receive('ok', (resp) => {
				console.log(`Joined successfully ${oracleBoxesChannelName}`);
				//handleMempoolSocketUpdate(resp);
			})
			.receive('error', (resp) => {
				console.error('Unable to join oracle_boxes:', resp);
			});

		oracleBoxesChannel.on(oracleBoxesChannelTopic, (payload) => {
			console.log('Update received for oracle_boxes:', payload);
			//handleMempoolSocketUpdate(payload);
		});

		// Cleanup on component unmount
		return () => {
			sigmausdChannel.leave();
			oracleBoxesChannel.leave();
			socket.disconnect();
		};
	});
</script>
