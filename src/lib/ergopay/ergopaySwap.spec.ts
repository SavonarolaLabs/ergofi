import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run, parseCommandLineArgs } from './ergopaySwap';
import type { ErgopayPayCmdResponse } from './ergopaySwap.types';
import type { NodeBox } from '$lib/stores/bank.types';
import type { MempoolSocketUpdate } from '$lib/stores/preparedInteractions';
import {
	fetchOracleData,
	fetchSigmaUsdBankTransactions,
	fetchUtxosByErgoTree
} from '$lib/api/mempoolServer';
import { simgaUsdConfirmedTransaction } from './ergopaySwap.mock';

const userBoxes: NodeBox[] = [
	{
		globalIndex: 45787878,
		inclusionHeight: 1443467,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '807e715029f3efba60ccf3a0f998ba025de1c22463c26db53287849ae4e31d3b',
		value: 602310307,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [],
		creationHeight: 1443463,
		additionalRegisters: {},
		transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
		index: 0
	}
];

const oracleBoxes: { confirmed_erg_usd: NodeBox[] } = {
	confirmed_erg_usd: [
		{
			additionalRegisters: {
				R4: '05e082b38607',
				R5: '0486b7b101'
			},
			assets: [
				{
					amount: 1,
					tokenId: '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f'
				}
			],
			boxId: '5cdadb8abae146b8b46ce594bc646b693dcf04a6baa04f68420d85e740b3d92f',
			creationHeight: 1453501,
			ergoTree:
				'100904000580ade204040c0e2077dffd47b690caa52fe13345aaf64ecdf7d55f2e7e3496e8206311f491aa46cd04080404040004000e20720978c041239e7d6eb249d801f380557126f6324e12c5ba9172d820be2e1dded806d601b2a5730000d602c67201060ed603e4c6a70504d604c1a7d6059272047301d6069aa37302d1ec95e67202d801d607ed93e47202cbc2a793cbc272017303ecededededededed8fa3720391a39972037304720593db63087201db6308a792c17201720493e4c672010405e4c6a7040593e4c67201050472037207ededededededededed92a37203720593db63087201db6308a792c17201720493db63087201db6308a792c17201720493e4c672010405e4c6a7040592e4c672010504720690e4c6720105049a720673057207edededed93c27201c2a793db63087201db6308a791c17201720493e4c672010405e4c6a7040593e4c6720105047203938cb2db6308b2a4730600730700017308',
			index: 0,
			transactionId: 'e3d31aed0c8f07b3d710676cdfbbf324dfedf6f038853c2bbd4e153bc47d1f1a',
			value: 4147250000
		}
	]
};

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
