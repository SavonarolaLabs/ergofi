// mempoolChannels.ts
import { writable, get } from 'svelte/store';
import { Socket } from 'phoenix';
import {
	cancelPreparedInteractionById,
	handleMempoolSocketUpdate,
	initHistory,
	prepared_interactions
} from './stores/preparedInteractions';
import { handleOracleBoxesUpdate, updateBestBankBox } from './stores/bank';
import { web3wallet_wallet_used_addresses } from './stores/web3wallet';

// We store references to the Socket and the channels so we can reference them later.
export const socketStore = writable<Socket | null>(null);
export const sigmausdChannelStore = writable<any>(null);
export const dexygoldChannelStore = writable<any>(null);
export const oracleBoxesChannelStore = writable<any>(null);

/**
 * Initialize and join all needed channels.
 * Return a cleanup function to be called when your component unmounts.
 */
export function initMempoolChannels() {
	// 1) Create and connect the socket
	const socket = new Socket('wss://ergfi.xyz:4004/socket', { params: {} });
	socket.connect();
	socketStore.set(socket);

	// 2) Join the "mempool:sigmausd_transactions" channel
	const sigmausdChannelTopic = 'sigmausd_transactions';
	const sigmausdChannelName = `mempool:${sigmausdChannelTopic}`;
	const sigmausdChannel = socket.channel(sigmausdChannelName, {});

	sigmausdChannel
		.join()
		.receive('ok', (resp) => {
			// If desired, initialize local data
			initHistory(resp.history, get(web3wallet_wallet_used_addresses));
			handleMempoolSocketUpdate(resp, get(web3wallet_wallet_used_addresses));
			updateBestBankBox(resp, get(prepared_interactions));
		})
		.receive('error', (resp) => {
			console.error('Unable to join sigmausd_transactions:', resp);
		});

	sigmausdChannel.on(sigmausdChannelTopic, (payload) => {
		handleMempoolSocketUpdate(payload, get(web3wallet_wallet_used_addresses));
		updateBestBankBox(payload, get(prepared_interactions));
	});

	sigmausdChannelStore.set(sigmausdChannel);

	// 3) Join the "mempool:oracle_boxes" channel
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

	oracleBoxesChannelStore.set(oracleBoxesChannel);

	// 4) Join the "mempool:dexygold_transactions" channel
	const dexygoldChannelTopic = 'dexygold_transactions';
	const dexygoldChannelName = `mempool:${dexygoldChannelTopic}`;
	const dexygoldChannel = socket.channel(dexygoldChannelName, {});

	dexygoldChannel
		.join()
		.receive('ok', (resp) => {
			//console.log('dexygoldChannel history:');
			//console.log(resp.history);
		})
		.receive('error', (resp) => {
			console.error('Unable to join dexygold_transactions:', resp);
		});

	return () => {
		sigmausdChannel.leave();
		oracleBoxesChannel.leave();
		dexygoldChannel.leave();
		socket.disconnect();
	};
}

/**
 * Push a "submit_tx" event to the sigmausd_channel,
 * which the server handles in `handle_in("submit_tx", ...)`.
 */

export function submitTx(transactionData: any, interactionId: string) {
	const sigmausdChannel = get(sigmausdChannelStore);
	if (!sigmausdChannel) {
		console.error('No sigmausdChannel available. Make sure initMempoolChannels() was called.');
		cancelPreparedInteractionById(interactionId);
		return;
	}

	sigmausdChannel
		.push('submit_tx', { transaction: transactionData })
		.receive('ok', (resp) => {
			console.log('TX Success:', resp);
			// Handle success in your UI, e.g. show a success toast, update state, etc.
		})
		.receive('error', (resp) => {
			cancelPreparedInteractionById(interactionId);
			console.error('TX Error:', resp);
			// Handle error in your UI, e.g. show an error message
		});
}
