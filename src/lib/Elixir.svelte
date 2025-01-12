<script lang="ts">
	import { onMount } from 'svelte';
	import { Socket } from 'phoenix';
	import {
		handleMempoolSocketUpdate,
		initHistory,
		prepared_interactions
	} from './stores/preparedInteractions';
	import { handleOracleBoxesUpdate, updateBestBankBox } from './stores/bank';
	import { web3wallet_wallet_change_address } from './stores/web3wallet';

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
				initHistory(
					resp.history,
					$web3wallet_wallet_change_address ? [$web3wallet_wallet_change_address] : []
				);
				handleMempoolSocketUpdate(resp);
				updateBestBankBox(resp, $prepared_interactions);
			})
			.receive('error', (resp) => {
				console.error('Unable to join sigmausd_transactions:', resp);
			});

		sigmausdChannel.on(sigmausdChannelTopic, (payload) => {
			handleMempoolSocketUpdate(payload);
			updateBestBankBox(payload, $prepared_interactions);
		});

		// Handle oracle_boxes channel
		const oracleBoxesChannelTopic = 'oracle_boxes';
		const oracleBoxesChannelName = `mempool:${oracleBoxesChannelTopic}`;
		const oracleBoxesChannel = socket.channel(oracleBoxesChannelName, {});

		oracleBoxesChannel
			.join()
			.receive('ok', (resp) => {
				handleOracleBoxesUpdate(resp);
			})
			.receive('error', (resp) => {
				console.error('Unable to join oracle_boxes:', resp);
			});

		oracleBoxesChannel.on(oracleBoxesChannelTopic, (payload) => {
			handleOracleBoxesUpdate(payload);
		});

		// Cleanup on component unmount
		return () => {
			sigmausdChannel.leave();
			oracleBoxesChannel.leave();
			socket.disconnect();
		};
	});
</script>
