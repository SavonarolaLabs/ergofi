import { createContext } from '../fakeContext';

import {
	ErgoBox,
	ErgoBoxes,
	ErgoStateContext,
	ReducedTransaction,
	UnsignedTransaction
} from 'ergo-lib-wasm-nodejs';
import { mnemonicToSeedSync } from 'bip39';
import * as wasm from 'ergo-lib-wasm-nodejs';
import type { EIP12UnsignedTransaction, SignedTransaction } from '@fleet-sdk/common';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

interface TokenInfo {
	tokenId: string;
	balance: string;
}

export interface StateAddress {
	id: number;
	name: string;
	address: string;
	path: string;
	idx: number;
	balance: string;
	walletId: number;
	proceedHeight: number;
	tokens: Array<TokenInfo>;
}

export async function getProver(mnemonic: string): Promise<wasm.Wallet> {
	const secretKeys = new wasm.SecretKeys();
	secretKeys.add(getWalletAddressSecret(mnemonic));
	return wasm.Wallet.from_secrets(secretKeys);
}

export async function signTx(
	tx: EIP12UnsignedTransaction,
	mnemonic: string,
	height: number | undefined = undefined
): Promise<SignedTransaction> {
	const prover = await getProver(mnemonic);

	const boxesToSign = tx.inputs;
	const boxes_to_spend = ErgoBoxes.empty();
	boxesToSign.forEach((box) => {
		boxes_to_spend.add(ErgoBox.from_json(JSON.stringify(box)));
	});

	const data_boxes = ErgoBoxes.empty();
	tx.dataInputs.forEach((box) => {
		data_boxes.add(ErgoBox.from_json(JSON.stringify(box)));
	});

	const signedTx = prover.sign_transaction(
		await createContext(height),
		wasm.UnsignedTransaction.from_json(JSON.stringify(tx)),
		boxes_to_spend,
		data_boxes
	);
	return signedTx.to_js_eip12();
}

export async function signTxRealContext(
	tx: EIP12UnsignedTransaction,
	mnemonic: string
): Promise<SignedTransaction> {
	const prover = await getProver(mnemonic);

	const boxesToSign = tx.inputs;
	const boxes_to_spend = ErgoBoxes.empty();
	boxesToSign.forEach((box) => {
		boxes_to_spend.add(ErgoBox.from_json(JSON.stringify(box)));
	});

	const data_boxes = ErgoBoxes.empty();
	tx.dataInputs.forEach((box) => {
		data_boxes.add(ErgoBox.from_json(JSON.stringify(box)));
	});

	const signedTx = prover.sign_transaction(
		await createContext(),
		wasm.UnsignedTransaction.from_json(JSON.stringify(tx)),
		boxes_to_spend,
		data_boxes
	);
	return signedTx.to_js_eip12();
}

const getWalletAddressSecret = (mnemonic: string, idx: number = 0) => {
	let seed = mnemonicToSeedSync(mnemonic);
	const path = calcPathFromIndex(idx);
	let bip32 = BIP32Factory(ecc);
	const extended = bip32.fromSeed(seed).derivePath(path);
	return wasm.SecretKey.dlog_from_bytes(Uint8Array.from(extended.privateKey ?? Buffer.from('')));
};

const RootPathWithoutIndex = "m/44'/429'/0'/0";
const calcPathFromIndex = (index: number) => `${RootPathWithoutIndex}/${index}`;

export function reducedFromUnsignedTx(
	unsignedTx: EIP12UnsignedTransaction,
	context: ErgoStateContext
): string {
	const inputBoxes = ErgoBoxes.from_boxes_json(unsignedTx.inputs);
	const dataBoxes = ErgoBoxes.from_boxes_json(unsignedTx.dataInputs);
	const wasmUnsignedTx = UnsignedTransaction.from_json(JSON.stringify(unsignedTx));

	const reduced = ReducedTransaction.from_unsigned_tx(
		wasmUnsignedTx,
		inputBoxes,
		dataBoxes,
		context
	);

	const rawBytes = reduced.sigma_serialize_bytes();
	const base64 = uint8ArrayToBase64UrlSafe(rawBytes);
	return base64;
}

// Standard base64, no replacements:
function uint8ArrayToBase64UrlSafe(uint8Array: Uint8Array): string {
	let base64 = btoa(String.fromCharCode(...uint8Array))
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	while (base64.length % 4 !== 0) {
		base64 += '=';
	}

	return base64;
}
