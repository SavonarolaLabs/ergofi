// src/lib/stores/transactions.ts
import { writable } from 'svelte/store';

export interface TransactionNode {
	id: string;
	// Add other properties as needed
}

interface NodeInfo {
	lastSeenMessageTime: number;
	height: number;
}

export const transactions = writable<TransactionNode[]>([]);
export const mempoolSize = writable<number>(0);
export const maxTxCount = 1000;

const nodeUrl = 'http://213.239.193.208:9053';
const pollingInterval = 5000;

let lastSeenMessageTime = 0;
let lastProcessedHeight = 0;

async function fetchNodeInfo(): Promise<NodeInfo> {
	const response = await fetch(`${nodeUrl}/info`);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return (await response.json()) as NodeInfo;
}

async function fetchMempoolTransactions(offset: number = 0): Promise<TransactionNode[]> {
	try {
		const response = await fetch(
			`${nodeUrl}/transactions/unconfirmed?limit=10000&offset=${offset}`
		);
		if (!response.ok) {
			console.error(`HTTP error! status: ${response.status}`);
			return [];
		}
		return (await response.json()) as TransactionNode[];
	} catch (error) {
		console.error('Error fetching mempool transactions:', error);
		return [];
	}
}

async function populateInitialSet() {
	let offset = 0;
	let transactionsArray: TransactionNode[] = [];
	let transactionsBatch: TransactionNode[];

	do {
		transactionsBatch = await fetchMempoolTransactions(offset);
		transactionsArray = transactionsArray.concat(transactionsBatch);
		offset += 10000;
	} while (transactionsBatch.length === 10000 && transactionsArray.length < maxTxCount);

	// Save transactions to store
	transactions.set(transactionsArray.slice(0, maxTxCount));
	mempoolSize.set(transactionsArray.length);

	// Get initial node info for baseline
	const nodeInfo = await fetchNodeInfo();
	lastSeenMessageTime = nodeInfo.lastSeenMessageTime;
	lastProcessedHeight = nodeInfo.height;

	console.log(`Mempool(${transactionsArray.length}) reset`);
}

async function checkForUpdates() {
	const nodeInfo = await fetchNodeInfo();

	// Check if block height has changed (indicates new block)
	if (nodeInfo.height !== lastProcessedHeight) {
		await handleNewBlock(nodeInfo.height);
		lastProcessedHeight = nodeInfo.height;
	}

	// Check if lastSeenMessageTime has changed (indicates new mempool activity)
	if (nodeInfo.lastSeenMessageTime !== lastSeenMessageTime) {
		await refreshMempool();
		lastSeenMessageTime = nodeInfo.lastSeenMessageTime;
	}
}

async function handleNewBlock(newHeight: number) {
	console.log(`New block at height ${newHeight}`);
	await populateInitialSet();
}

async function refreshMempool() {
	let offset = 0;
	let transactionsArray: TransactionNode[] = [];
	let transactionsBatch: TransactionNode[];

	do {
		transactionsBatch = await fetchMempoolTransactions(offset);
		transactionsArray = transactionsArray.concat(transactionsBatch);
		offset += 10000;
	} while (transactionsBatch.length === 10000 && transactionsArray.length < maxTxCount);

	// Update transactions store
	transactions.set(transactionsArray.slice(0, maxTxCount));
	mempoolSize.set(transactionsArray.length);
}

function startPolling() {
	setInterval(async () => {
		try {
			await checkForUpdates();
		} catch (error) {
			console.error('Error during mempool update:', error);
		}
	}, pollingInterval);
}

// Start the initial population and polling
populateInitialSet().then(startPolling);
