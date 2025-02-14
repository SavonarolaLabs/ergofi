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
import { info } from './stores/nodeInfo';
import { jsonParseBigInt } from './api/ergoNode';

export const socketStore = writable<Socket | null>(null);
export const infoChannelStore = writable<any>(null);
export const sigmausdChannelStore = writable<any>(null);
export const dexygoldChannelStore = writable<any>(null);
export const oracleBoxesChannelStore = writable<any>(null);

function convertBigInts(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(convertBigInts);
	} else if (obj && typeof obj === 'object') {
		const copy: any = {};
		for (const [k, v] of Object.entries(obj)) {
			if (k === 'value' || k === 'amount') {
				copy[k] = String(v);
			} else {
				copy[k] = convertBigInts(v);
			}
		}
		return copy;
	}
	return obj;
}

export function initMempoolChannels() {
	// Create and connect the socket with proper Phoenix message handling
	const socket = new Socket('wss://ergfi.xyz:4004/socket', {
		decode: (rawPayload, callback) => {
			try {
				// Handle binary messages
				if (rawPayload.constructor === ArrayBuffer) {
					return callback(rawPayload); // Let Phoenix handle binary messages
				}

				// Parse the JSON string into array
				const [join_ref, ref, topic, event, payload] = JSON.parse(rawPayload);

				// Convert any BigInts in the payload
				const convertedPayload = convertBigInts(payload);

				// Return the properly structured Phoenix message
				return callback({
					join_ref,
					ref,
					topic,
					event,
					payload: convertedPayload
				});
			} catch (error) {
				console.error('Error decoding Phoenix message:', error);
				return callback(null);
			}
		}
	});
	socket.connect();
	socketStore.set(socket);

	// info channel
	const infoChannelTopic = 'info';
	const infoChannelName = `mempool:${infoChannelTopic}`;
	const infoChannel = socket.channel(infoChannelName, {});
	infoChannel
		.join()
		.receive('ok', (resp) => {
			info.set(resp);
		})
		.receive('error', (resp) => {
			console.error('Unable to join info channel:', resp);
		});
	infoChannel.on('node_info', (payload) => {
		info.set(payload);
	});
	infoChannelStore.set(infoChannel);

	// sigmausd transactions channel
	const sigmausdChannelTopic = 'sigmausd_transactions';
	const sigmausdChannelName = `mempool:${sigmausdChannelTopic}`;
	const sigmausdChannel = socket.channel(sigmausdChannelName, {});

	sigmausdChannel
		.join()
		.receive('ok', (resp) => {
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

	// oracle boxes channel
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

	// dexygold transactions channel
	const dexygoldChannelTopic = 'dexygold_transactions';
	const dexygoldChannelName = `mempool:${dexygoldChannelTopic}`;
	const dexygoldChannel = socket.channel(dexygoldChannelName, {});

	dexygoldChannel
		.join()
		.receive('ok', (resp) => {
			// Handle initial response if needed
		})
		.receive('error', (resp) => {
			console.error('Unable to join dexygold_transactions:', resp);
		});

	dexygoldChannelStore.set(dexygoldChannel);

	// Return cleanup function
	return () => {
		sigmausdChannel.leave();
		oracleBoxesChannel.leave();
		dexygoldChannel.leave();
		socket.disconnect();
	};
}

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
		})
		.receive('error', (resp) => {
			cancelPreparedInteractionById(interactionId);
			console.error('TX Error:', resp);
		});
}
