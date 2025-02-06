import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run, parseCommandLineArgs } from './ergopaySwap';
import type { ErgopayPayCmdResponse } from './ergopaySwap.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';
import {
	fetchOracleData,
	fetchSigmaUsdBankTransactions,
	fetchUtxosByErgoTree
} from '$lib/api/mempoolServer';
import { oracleBoxes, simgaUsdConfirmedTransaction, userBoxes } from './ergopaySwap.mock';

const bankTransactions: MempoolSocketUpdate = {
	confirmed_transactions: [simgaUsdConfirmedTransaction],
	unconfirmed_transactions: []
};

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
		// @ts-ignore
		if (url.includes('utxosByErgoTree')) return new Response(JSON.stringify(userBoxes));
		// @ts-ignore
		if (url.includes('oracles')) return new Response(JSON.stringify(oracleBoxes));
		// @ts-ignore
		if (url.includes('sigmUsdBank')) return new Response(JSON.stringify(bankTransactions));
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
			address: '9hF23...'
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
	it('should return an error when swap fails', async () => {
		const mockInput = {
			swapPair: 'ERG/SIGUSD',
			amount: 100000000,
			ePayLinkId: 'link123',
			lastInput: 'ERG',
			address: '9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8',
			feeMining: '1000000000'
		};
		vi.spyOn(process, 'argv', 'get').mockReturnValue([
			'bun',
			'swap.cli.ts',
			JSON.stringify(mockInput)
		]);

		const result: ErgopayPayCmdResponse = await run();
		expect(result.status).toBe('error');
	});

	it('should return a successful response when swap succeeds', async () => {
		const mockInput = {
			swapPair: 'ERG/SIGUSD',
			amount: 100000000,
			ePayLinkId: 'link123',
			lastInput: 'ERG',
			address: '9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8',
			feeMining: '1000000000'
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
