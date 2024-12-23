import { parse } from '@fleet-sdk/serializer';

//const NODE_URL = 'http://213.239.193.208:9053';
const NODE_URL = 'http://localhost:9053';

export const ORACLE_ERG_USD_NFT =
	'011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f';
export const TOKEN_SIGRSV = '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0';
export const TOKEN_SIGUSD = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04';
export const TOKEN_BANK_NFT = '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9';
export const SIGUSD_BANK_ADDRESS =
	'MUbV38YgqHy7XbsoXWF5z7EZm524Ybdwe5p9WDrbhruZRtehkRPT92imXer2eTkjwPDfboa1pR3zb3deVKVq3H7Xt98qcTqLuSBSbHb7izzo5jphEpcnqyKJ2xhmpNPVvmtbdJNdvdopPrHHDBbAGGeW7XYTQwEeoRfosXzcDtiGgw97b2aqjTsNFmZk7khBEQywjYfmoDc9nUCJMZ3vbSspnYo3LarLe55mh2Np8MNJqUN9APA6XkhZCrTTDRZb1B4krgFY1sVMswg2ceqguZRvC9pqt3tUUxmSnB24N6dowfVJKhLXwHPbrkHViBv1AKAJTmEaQW2DN1fRmD9ypXxZk8GXmYtxTtrj3BiunQ4qzUCu1eGzxSREjpkFSi2ATLSSDqUwxtRz639sHM6Lav4axoJNPCHbY8pvuBKUxgnGRex8LEGM8DeEJwaJCaoy8dBw9Lz49nq5mSsXLeoC4xpTUmp47Bh7GAZtwkaNreCu74m9rcZ8Di4w1cmdsiK1NWuDh9pJ2Bv7u3EfcurHFVqCkT3P86JUbKnXeNxCypfrWsFuYNKYqmjsix82g9vWcGMmAcu5nagxD4iET86iE2tMMfZZ5vqZNvntQswJyQqv2Wc6MTh4jQx1q2qJZCQe4QdEK63meTGbZNNKMctHQbp3gRkZYNrBtxQyVtNLR8xEY8zGp85GeQKbb37vqLXxRpGiigAdMe3XZA4hhYPmAAU5hpSMYaRAjtvvMT3bNiHRACGrfjvSsEG9G2zY5in2YWz5X9zXQLGTYRsQ4uNFkYoQRCBdjNxGv6R58Xq74zCgt19TxYZ87gPWxkXpWwTaHogG1eps8WXt8QzwJ9rVx6Vu9a5GjtcGsQxHovWmYixgBU8X9fPNJ9UQhYyAWbjtRSuVBtDAmoV1gCBEPwnYVP5GCGhCocbwoYhZkZjFZy6ws4uxVLid3FxuvhWvQrVEDYp7WRvGXbNdCbcSXnbeTrPMey1WPaXX';
export const SIGUSD_BANK_TREE =
	'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329';

type NetworkParameters = {
	outputCost: number;
	tokenAccessCost: number;
	maxBlockCost: number;
	height: number;
	maxBlockSize: number;
	dataInputCost: number;
	blockVersion: number;
	inputCost: number;
	storageFeeFactor: number;
	minValuePerByte: number;
};

export type ErgoNodeInfo = {
	currentTime: number;
	network: string;
	name: string;
	stateType: string;
	difficulty: number;
	bestFullHeaderId: string;
	bestHeaderId: string;
	peersCount: number;
	unconfirmedCount: number;
	appVersion: string;
	eip37Supported: boolean;
	stateRoot: string;
	genesisBlockId: string;
	previousFullHeaderId: string;
	fullHeight: number;
	headersHeight: number;
	stateVersion: string;
	fullBlocksScore: number;
	maxPeerHeight: number;
	launchTime: number;
	isExplorer: boolean;
	lastSeenMessageTime: number;
	eip27Supported: boolean;
	headersScore: number;
	parameters: NetworkParameters;
	isMining: boolean;
};

// Mempool Transaction

type SpendingProof = {
	proofBytes: string;
	extension: Record<string, string>;
};

type Input = {
	boxId: string;
	spendingProof: SpendingProof;
};

type DataInput = {
	boxId: string;
};

export type Asset = {
	tokenId: string;
	amount: number;
};

export type Output = {
	boxId: string;
	value: number;
	ergoTree: string;
	creationHeight: number;
	assets: Asset[];
	additionalRegisters: Record<string, string>;
	transactionId: string;
	index: number;
};

export type MempoolTransaction = {
	id: string;
	inputs: Input[];
	dataInputs: DataInput[];
	outputs: Output[];
	size: number;
};

export async function fetchNodeInfo(): Promise<ErgoNodeInfo> {
	const response = await fetch(`${NODE_URL}/info`);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return (await response.json()) as ErgoNodeInfo;
}

export async function fetchMempoolTransactions(offset: number = 0): Promise<MempoolTransaction[]> {
	try {
		const response = await fetch(
			`${NODE_URL}/transactions/unconfirmed?limit=10000&offset=${offset}`
		);
		if (!response.ok) {
			console.error(`HTTP error! status: ${response.status}`);
			return [];
		}
		return (await response.json()) as MempoolTransaction[];
	} catch (error) {
		console.error('Error fetching mempool transactions:', error);
		return [];
	}
}

const knownPeers = [
	'213.239.193.208:9053',
	'159.65.11.55:9053',
	'165.227.26.175:9053',
	'159.89.116.15:9053',
	'136.244.110.145:9053',
	'94.130.108.35:9053',
	'51.75.147.1:9053',
	'221.165.214.185:9053',
	'217.182.197.196:9053',
	'173.212.220.9:9053',
	'176.9.65.58:9053',
	'213.152.106.56:9053'
];
const index = 0;

export async function getOracleBox(): Promise<Output> {
	console.log('fetching Oracle box');
	console.log('index,', knownPeers[index]);
	const resp = await fetch(
		`http://${knownPeers[index]}/blockchain/box/unspent/byTokenId/${ORACLE_ERG_USD_NFT}`
	);
	let data = await resp.json();
	let oracleBox = data[0];
	return oracleBox;
}
//66.94.127.1:9053/
//213.239.193.208:9053/

export async function getBankBox(): Promise<Output> {
	const resp = await fetch(
		`http://${knownPeers[index]}/blockchain/box/unspent/byTokenId/${TOKEN_BANK_NFT}`
	);
	let data = await resp.json();
	let bankBox = data[0];
	return bankBox;
}

export function decodeBigInt(register: string): bigint {
	const parsed = parse<bigint>(register);
	return parsed;
}
