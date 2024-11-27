// src/stores/transactionStore.ts

import { get, writable } from 'svelte/store';
import { transactionDB } from '$lib/database/transactionDatabase';

interface TransactionInput {
	additionalRegisters: Record<string, any>;
	assets: any[];
	boxId: string;
	creationHeight: number;
	ergoTree: string;
	index: number;
	spendingProof: {
		extension: Record<string, any>;
		proofBytes: string;
	};
	transactionId: string;
	value: number;
}

interface TransactionOutput {
	additionalRegisters: Record<string, any>;
	assets: any[];
	boxId: string;
	creationHeight: number;
	ergoTree: string;
	index: number;
	transactionId: string;
	value: number;
}

interface Transaction {
	dataInputs: any[];
	id: string;
	inputs: TransactionInput[];
	outputs: TransactionOutput[];
	size: number;
	timestamp?: number; // Include if available
	// Additional fields for processed data
	bank?: any;
	user?: any;
	txData?: any;
	shortenedId?: string;
	shortenedAddress?: string;
	formattedTimestamp?: string;
}

interface TransactionsResponse {
	items: Transaction[];
	total?: number;
}

export const transactions = writable<Transaction[]>([]);
export const totalTransactions = writable<number>(0);
export const currentPage = writable<number>(1);
export const itemsPerPage = writable<number>(10);
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);
export const syncProgress = writable<number>(0); // Number of transactions synchronized

// Fetch transactions from IndexedDB
export async function fetchTransactions(page: number = 1) {
	isLoading.set(true);
	error.set(null);
	currentPage.set(page);

	const limit = get(itemsPerPage);

	try {
		// Retrieve from IndexedDB
		const storedTransactions = await transactionDB.getTransactions({
			page,
			limit
		});

		if (storedTransactions.items.length > 0) {
			transactions.set(storedTransactions.items);
			totalTransactions.set(storedTransactions.total);
		} else {
			// Fetch initial data from server if IndexedDB is empty
			const offset = (page - 1) * limit;
			const response = await fetch(
				`http://localhost:4000/api/transactions/sigmausd?offset=${offset}&limit=${limit}`
			);

			if (!response.ok) {
				throw new Error(`Error fetching transactions: ${response.statusText}`);
			}

			const data: TransactionsResponse = await response.json();

			// Store fetched transactions in IndexedDB
			await transactionDB.addTransactions(data.items);

			transactions.set(data.items);

			// Since we don't have the total count from the server, we set it based on the number of items fetched
			totalTransactions.set(data.items.length);
		}
	} catch (err: any) {
		error.set(err.message);
		console.error(err);
	} finally {
		isLoading.set(false);
	}
}

// Function to sync transactions in the background
export async function syncTransactions() {
	isLoading.set(true);
	error.set(null);
	syncProgress.set(0);

	try {
		const batchSize = 100;
		let offset = 0;
		let totalFetched = 0;
		let hasMore = true;

		while (hasMore) {
			const response = await fetch(
				`http://localhost:4000/api/transactions/sigmausd?offset=${offset}&limit=${batchSize}`
			);
			if (!response.ok) {
				throw new Error(`Error fetching transactions: ${response.statusText}`);
			}
			const data: TransactionsResponse = await response.json();

			// Store fetched transactions in IndexedDB
			await transactionDB.addTransactions(data.items);

			const fetchedCount = data.items.length;
			totalFetched += fetchedCount;
			offset += fetchedCount;

			// Update sync progress
			syncProgress.set(totalFetched);

			// Check if there are more transactions to fetch
			hasMore = fetchedCount === batchSize;

			// Yield control to update UI
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		// Update totalTransactions based on the total fetched
		totalTransactions.set(totalFetched);
	} catch (err: any) {
		error.set(err.message);
		console.error(err);
	} finally {
		isLoading.set(false);
	}
}

// Additional utility functions for filtering and sorting
export async function filterTransactions(filter: Partial<Transaction>) {
	const filteredTransactions = await transactionDB.getTransactions({ filter });
	transactions.set(filteredTransactions.items);
	totalTransactions.set(filteredTransactions.total);
}

export async function sortTransactions(
	sortBy: 'timestamp' | 'bank' | 'user',
	direction: 'asc' | 'desc' = 'desc'
) {
	const sortedTransactions = await transactionDB.getTransactions({
		sortBy,
		sortDirection: direction
	});
	transactions.set(sortedTransactions.items);
	totalTransactions.set(sortedTransactions.total);
}
