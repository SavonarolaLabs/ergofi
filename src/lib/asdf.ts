import type { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import { updateBestBankBoxLocal } from './stores/bank';
import {
	addPreparedInteraction,
	addSignedInteraction,
	cancelPreparedInteractionById,
	confirmed_interactions,
	mempool_interactions,
	prepared_interactions,
	type Interaction
} from './stores/preparedInteractions';
import { get } from 'svelte/store';

// Web3 Wallet interactions
export async function getWeb3WalletData() {
	await window.ergoConnector.nautilus.connect();
	const me = await ergo.get_change_address();
	const utxos = await ergo.get_utxos();
	const height = await ergo.get_current_height();
	return { me, utxos, height };
}
export async function createInteractionAndSubmitTx(
	unsignedTx: ErgoUnsignedTransaction,
	ownAddressList: string[]
) {
	console.log('createInteractionAndSubmitTx');
	const interactionId = addPreparedInteraction(unsignedTx, ownAddressList);
	try {
		console.log({ unsignedTx });
		const signed = await ergo.sign_tx(unsignedTx);

		addSignedInteraction(signed, interactionId, ownAddressList);

		updateBestBankBoxLocal(
			get(confirmed_interactions),
			get(mempool_interactions),
			get(prepared_interactions)
		);
		console.log({ signed });
		//submitTx(signed, interactionId);
	} catch (e) {
		console.log(e);
		cancelPreparedInteractionById(interactionId);
	}
}
