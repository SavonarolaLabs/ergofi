// ergopaySwap.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ergopaySwap from './ergopaySwap';
import { run, parseCommandLineArgs } from './ergopaySwap';

import type { ErgopayPayCmdResponse } from './ergopaySwap.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';
import {
	fetchOracleData,
	fetchSigmaUsdBankTransactions,
	fetchUtxosByErgoTree
} from '$lib/api/mempoolServer';
import { headers, oracleBoxes, simgaUsdConfirmedTransaction, userBoxes } from './ergopaySwap.mock';

const bankTransactions: MempoolSocketUpdate = {
	confirmed_transactions: [simgaUsdConfirmedTransaction],
	unconfirmed_transactions: []
};

// --- Mock the entire ergopaySwap module but keep all original exports except reduceUnsignedTx:
vi.mock('./ergopaySwap', async () => {
	const actual = await vi.importActual<any>('./ergopaySwap');
	return {
		...actual
	};
});

beforeEach(() => {
	vi.restoreAllMocks();

	//@ts-ignore
	vi.spyOn(global, 'fetch').mockImplementation(async (url: string | Request) => {
		const urlString = typeof url === 'string' ? url : url.url;
		if (urlString.includes('utxosByErgoTree')) {
			return new Response(JSON.stringify(userBoxes));
		} else if (urlString.includes('oracles')) {
			return new Response(JSON.stringify(oracleBoxes));
		} else if (urlString.includes('sigmUsdBank')) {
			return new Response(JSON.stringify(bankTransactions));
		} else if (urlString.includes('chainSlice')) {
			return new Response(JSON.stringify(headers));
		}
		return new Response(JSON.stringify([]));
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('parseCommandLineArgs', () => {
	it('should throw an error for missing arguments', () => {
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'script.js']);
		expect(() => parseCommandLineArgs()).toThrow("Usage: bun swap.cli.ts '<jsonString>'");
	});

	it('should throw an error for invalid JSON input', () => {
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'script.js', '{invalidJson']);
		expect(() => parseCommandLineArgs()).toThrow('Invalid JSON input');
	});

	it('should parse valid JSON input correctly', () => {
		const mockInput = {
			swapPair: 'ERG/USD',
			amount: 100,
			ePayLinkId: 'link123',
			lastInput: 'input456',
			payerAddress: '9hF23...'
		};
		vi.spyOn(process, 'argv', 'get').mockReturnValue([
			'bun',
			'swap.cli.ts',
			JSON.stringify(mockInput)
		]);

		const parsedParams = parseCommandLineArgs();
		expect(parsedParams).toEqual(mockInput);
	});
});

describe('fetch functions', () => {
	it('fetchUtxoByAddress should return user UTXOs', async () => {
		const result = await fetchUtxosByErgoTree('some-address');
		expect(result).toEqual(userBoxes);
	});

	it('fetchOracleCandidateBoxes should return oracle boxes', async () => {
		const result = await fetchOracleData();
		expect(result).toEqual(oracleBoxes);
	});

	it('fetchSigmaUsdBankBoxCandidates should return bank boxes', async () => {
		const result = await fetchSigmaUsdBankTransactions();
		expect(result).toEqual(bankTransactions);
	});
});

describe('run()', () => {
	it('should return a successful response when swap succeeds', async () => {
		const mockInput = {
			swapPair: 'ERG/SIGUSD',
			amount: 100_000_000,
			ePayLinkId: 'link123',
			lastInput: 'ERG',
			payerAddress: '9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8',
			feeMining: 10_000_000
		};
		vi.spyOn(process, 'argv', 'get').mockReturnValue([
			'bun',
			'swap.cli.ts',
			JSON.stringify(mockInput)
		]);

		const result: ErgopayPayCmdResponse = await run();
		expect(result.status).toBe('ok');
	});
});
