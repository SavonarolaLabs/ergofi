// src/stores/transactionStore.ts
import { get, writable } from 'svelte/store';

interface Transaction {
	id: string;
	inputs: any[];
	outputs: any[];
	size: number;
	bank?: any;
	user?: any;
	txData?: any;
	shortenedId?: string;
	shortenedAddress?: string;
	formattedTimestamp?: string;
}

interface TransactionsResponse {
	items: Transaction[];
	total: number;
}

export const transactions = writable<Transaction[]>([]);
export const totalTransactions = writable<number>(0);
export const currentPage = writable<number>(1);
export const itemsPerPage = writable<number>(10);
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);

export async function fetchTransactions(page: number = 1) {
	isLoading.set(true);
	error.set(null);
	currentPage.set(page);

	const limit = get(itemsPerPage);
	const offset = (page - 1) * limit;

	try {
		const response = await fetch(
			`http://localhost:4000/api/transactions/sigmausd?offset=${offset}&limit=${limit}`
		);

		if (!response.ok) {
			throw new Error(`Error fetching transactions: ${response.statusText}`);
		}

		const data: TransactionsResponse = await response.json();

		transactions.set(data.items);
		totalTransactions.set(data.total);
	} catch (err) {
		error.set(err.message);
		console.error(err);
	} finally {
		isLoading.set(false);
	}
}
