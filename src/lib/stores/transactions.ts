// src/lib/stores/transactions.ts
import {
	fetchMempoolTransactions,
	fetchNodeInfo,
	TOKEN_BANK_NFT,
	type Asset,
	type ErgoNodeInfo,
	type MempoolTransaction
} from '$lib/api/ergoNode';
import { writable } from 'svelte/store';

export const transactions = writable<MempoolTransaction[]>([]);
export const mempoolSize = writable<number>(0);
export const maxTxCount = 1000;

// New store to hold the bank box chains
export const bankBoxChains = writable<any[]>([]);

const pollingInterval = 5000;

let lastSeenMessageTime = 0;
let lastProcessedHeight = 0;

async function populateInitialSet() {
	let offset = 0;
	let transactionsArray: MempoolTransaction[] = [];
	let transactionsBatch: MempoolTransaction[];

	do {
		transactionsBatch = await fetchMempoolTransactions(offset);
		transactionsArray = transactionsArray.concat(transactionsBatch);
		offset += 10000;
	} while (transactionsBatch.length === 10000 && transactionsArray.length < maxTxCount);

	// Save transactions to store
	transactions.set(transactionsArray.slice(0, maxTxCount));
	mempoolSize.set(transactionsArray.length);

	// Process transactions to build bank box chains
	buildBankBoxChains(transactionsArray);

	// Get initial node info for baseline
	const nodeInfo: ErgoNodeInfo = await fetchNodeInfo();
	lastSeenMessageTime = nodeInfo.lastSeenMessageTime;
	lastProcessedHeight = nodeInfo.fullHeight;

	console.log(`Mempool(${transactionsArray.length}) reset`);
}

async function checkForUpdates() {
	const nodeInfo = await fetchNodeInfo();

	// Check if block height has changed (indicates new block)
	if (nodeInfo.fullHeight !== lastProcessedHeight) {
		await handleNewBlock(nodeInfo.fullHeight);
		lastProcessedHeight = nodeInfo.fullHeight;
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
	let transactionsArray: MempoolTransaction[] = [];
	let transactionsBatch: MempoolTransaction[];

	do {
		transactionsBatch = await fetchMempoolTransactions(offset);
		transactionsArray = transactionsArray.concat(transactionsBatch);
		offset += 10000;
	} while (transactionsBatch.length === 10000 && transactionsArray.length < maxTxCount);

	// Update transactions store
	transactions.set(transactionsArray.slice(0, maxTxCount));
	mempoolSize.set(transactionsArray.length);

	// Process transactions to build bank box chains
	buildBankBoxChains(transactionsArray);
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

// New function to build bank box chains
function buildBankBoxChains(transactionsArray: MempoolTransaction[]) {
	const boxes = new Map(); // boxId -> box info
	const txMap = new Map(); // txId -> transaction

	// Collect all transactions and build maps
	transactionsArray.forEach((tx) => {
		txMap.set(tx.id, tx);

		tx.outputs.forEach((output) => {
			boxes.set(output.boxId, {
				box: output,
				createdBy: tx.id,
				spentBy: []
			});
		});
	});

	// Map inputs to spending transactions
	transactionsArray.forEach((tx) => {
		tx.inputs.forEach((input) => {
			if (boxes.has(input.boxId)) {
				boxes.get(input.boxId).spentBy.push(tx.id);
			} else {
				// External input (could be the initial bank box)
				boxes.set(input.boxId, {
					box: { boxId: input.boxId },
					createdBy: null,
					spentBy: [tx.id]
				});
			}
		});
	});

	// Identify bank boxes (boxes containing TOKEN_BANK_NFT)
	const bankBoxes = Array.from(boxes.values()).filter((boxInfo) => {
		return boxInfo.box.assets?.some((asset: Asset) => asset.tokenId === TOKEN_BANK_NFT);
	});

	// Build chains starting from the latest bank boxes
	const chains = [];
	const visitedBoxes = new Set();
	const visitedTxs = new Set();

	bankBoxes.forEach((bankBox) => {
		const chain = [];
		traverseBankBoxChain(bankBox.box.boxId, chain, visitedBoxes, visitedTxs, boxes, txMap);
		if (chain.length > 0) {
			chains.push(chain);
		}
	});

	// Update the bankBoxChains store
	bankBoxChains.set(chains);
}

function traverseBankBoxChain(boxId, chain, visitedBoxes, visitedTxs, boxes, txMap) {
	if (visitedBoxes.has(boxId)) return;
	visitedBoxes.add(boxId);

	const boxInfo = boxes.get(boxId);
	if (!boxInfo) return;

	chain.push({ type: 'box', box: boxInfo.box });

	// If the box is spent by transactions in the mempool
	if (boxInfo.spentBy.length > 0) {
		// Sort conflicting transactions by fee (higher fee first)
		const sortedTxIds = boxInfo.spentBy
			.map((txId) => txMap.get(txId))
			.filter((tx) => tx)
			.sort((a, b) => BigInt(b.fee) - BigInt(a.fee))
			.map((tx) => tx.id);

		sortedTxIds.forEach((txId, index) => {
			if (visitedTxs.has(txId)) return;
			visitedTxs.add(txId);

			const tx = txMap.get(txId);
			if (tx) {
				chain.push({ type: 'tx', tx, isMainBranch: index === 0 });
				tx.outputs.forEach((output) => {
					// Only traverse boxes containing the TOKEN_BANK_NFT
					if (output.assets?.some((asset) => asset.tokenId === TOKEN_BANK_NFT)) {
						traverseBankBoxChain(output.boxId, chain, visitedBoxes, visitedTxs, boxes, txMap);
					}
				});
			}
		});
	}
}
