import type { ErgoNodeInfo } from '$lib/api/ergoNode';
import { writable, type Writable } from 'svelte/store';

const infoJSON = {
	currentTime: 1739100586409,
	network: 'mainnet',
	name: 'ergo-mainnet-5.1.0',
	stateType: 'utxo',
	difficulty: 1489876910342144,
	bestFullHeaderId: 'b8aa9462c0d282cd3c99969c9a9082fb43ef87f2f429a0b7441f6c52f45ba502',
	bestHeaderId: 'b8aa9462c0d282cd3c99969c9a9082fb43ef87f2f429a0b7441f6c52f45ba502',
	peersCount: 107,
	unconfirmedCount: 6,
	appVersion: '5.1.1-30-6579ceac-SNAPSHOT',
	eip37Supported: true,
	stateRoot: 'f32bce64d0f98e9aec07603ec1c9a7596573fc4a78dda436bd6288362e7a327519',
	genesisBlockId: 'b0244dfc267baca974a4caee06120321562784303a8a688976ae56170e4d175b',
	previousFullHeaderId: '99174467ee35086e7f5cd63a2c7f32b448710f2b06d499913bd16c8aa8d958b1',
	fullHeight: 1457695,
	headersHeight: 1457695,
	stateVersion: 'b8aa9462c0d282cd3c99969c9a9082fb43ef87f2f429a0b7441f6c52f45ba502',
	fullBlocksScore: 2549010018711805886464,
	maxPeerHeight: 1457695,
	launchTime: 1739048260767,
	isExplorer: true,
	lastSeenMessageTime: 1739100565722,
	eip27Supported: true,
	headersScore: 2549010018711805886464,
	parameters: {
		outputCost: 298,
		tokenAccessCost: 100,
		maxBlockCost: 8001091,
		height: 1457152,
		maxBlockSize: 1271009,
		dataInputCost: 100,
		blockVersion: 3,
		inputCost: 2407,
		storageFeeFactor: 1250000,
		minValuePerByte: 360
	},
	isMining: false
};

export const info: Writable<ErgoNodeInfo> = writable(infoJSON);
