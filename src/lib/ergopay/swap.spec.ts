import { describe, it, expect, vi } from 'vitest';
import { run, parseCommandLineArgs } from './swap';
import * as moduleFunctions from './swap';
import { ErgoBox } from '@fleet-sdk/core';
import type { ErgopayPayCmdResponse } from './swap.types';

const userBoxes: ErgoBox[] = [];
const oracleBoxes: ErgoBox[] = [];
const bankBoxes: ErgoBox[] = [];

vi.mock('./swap', async () => {
	const actual = await vi.importActual<typeof moduleFunctions>('./swap');

	return {
		...actual,
		fetchUtxoByAddress: vi.fn(() => Promise.resolve(userBoxes)),
		fetchOracleCandidateBoxes: vi.fn(() => Promise.resolve(oracleBoxes)),
		fetchSigmaUsdBankBoxCandidates: vi.fn(() => Promise.resolve(bankBoxes))
	};
});

describe('parseCommandLineArgs', () => {
	it('should throw an error for missing arguments', () => {
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'script.js']);
		expect(() => parseCommandLineArgs()).toThrow("Usage: node script.js '<jsonString>'");
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
			'node',
			'script.js',
			JSON.stringify(mockInput)
		]);

		const parsedParams = parseCommandLineArgs();
		expect(parsedParams).toEqual(mockInput);
	});
});

describe('run()', () => {
	it('should return an error when swap fails', async () => {
		// Mock parseCommandLineArgs to avoid messing with real process.argv
		vi.spyOn(moduleFunctions, 'parseCommandLineArgs').mockReturnValue({
			swapPair: 'ERG/USD',
			amount: 100,
			ePayLinkId: 'link123',
			lastInput: 'input456',
			address: '9hF23...'
		} as any);

		const result: ErgopayPayCmdResponse = await run();
		expect(result.status).toBe('error');
		expect(result.error?.code).toBe(422);
		expect(result.error?.message).toContain('Reserve rate is below 400%');
	});
});
