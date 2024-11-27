// src/lib/database/transactionDatabase.ts

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Define the schema for the transactions database
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

interface TransactionDBSchema extends DBSchema {
	transactions: {
		key: string; // transaction id
		value: Transaction;
		indexes: {
			'by-timestamp': number; // Assuming timestamp is a number
			'by-bank': string;
			'by-user': string;
		};
	};
}

export class TransactionDatabase {
	private dbPromise: Promise<IDBPDatabase<TransactionDBSchema>>;

	constructor() {
		this.dbPromise = openDB<TransactionDBSchema>('SigmaUSDTransactions', 1, {
			upgrade(db) {
				// Create transactions object store
				const txStore = db.createObjectStore('transactions', {
					keyPath: 'id'
				});

				// Create indexes for efficient querying
				txStore.createIndex('by-timestamp', 'timestamp');
				txStore.createIndex('by-bank', 'bank.address');
				txStore.createIndex('by-user', 'user.address');
			}
		});
	}

	// Add or update a single transaction
	async addTransaction(transaction: Transaction) {
		const db = await this.dbPromise;
		const tx = db.transaction('transactions', 'readwrite');
		await tx.store.put(transaction);
		await tx.done;
	}

	// Add multiple transactions
	async addTransactions(transactions: Transaction[]) {
		const db = await this.dbPromise;
		const tx = db.transaction('transactions', 'readwrite');
		for (const transaction of transactions) {
			await tx.store.put(transaction);
		}
		await tx.done;
	}

	// Retrieve transactions with pagination and optional filtering
	async getTransactions(
		options: {
			page?: number;
			limit?: number;
			sortBy?: 'timestamp' | 'bank' | 'user';
			sortDirection?: 'asc' | 'desc';
			filter?: Partial<Transaction>;
		} = {}
	) {
		const {
			page = 1,
			limit = 10,
			sortBy = 'timestamp',
			sortDirection = 'desc',
			filter = {}
		} = options;

		const db = await this.dbPromise;
		const tx = db.transaction('transactions', 'readonly');
		const store = tx.objectStore('transactions');

		// Retrieve all transactions
		let allTransactions = await store.getAll();

		// Apply filter if provided
		let results = allTransactions.filter((tx) =>
			Object.entries(filter).every(([key, value]) => {
				const txValue = tx[key as keyof Transaction];
				return txValue === value;
			})
		);

		// Sort results
		results.sort((a, b) => {
			let valueA: any;
			let valueB: any;
			if (sortBy === 'timestamp') {
				valueA = a.timestamp || 0;
				valueB = b.timestamp || 0;
			} else if (sortBy === 'bank') {
				valueA = a.bank?.address || '';
				valueB = b.bank?.address || '';
			} else if (sortBy === 'user') {
				valueA = a.user?.address || '';
				valueB = b.user?.address || '';
			}
			if (valueA > valueB) {
				return sortDirection === 'asc' ? 1 : -1;
			} else if (valueA < valueB) {
				return sortDirection === 'asc' ? -1 : 1;
			} else {
				return 0;
			}
		});

		// Paginate
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		return {
			items: results.slice(startIndex, endIndex),
			total: allTransactions.length // Return total transactions count
		};
	}

	// Clear all transactions
	async clearTransactions() {
		const db = await this.dbPromise;
		const tx = db.transaction('transactions', 'readwrite');
		await tx.store.clear();
		await tx.done;
	}
}

export const transactionDB = new TransactionDatabase();
