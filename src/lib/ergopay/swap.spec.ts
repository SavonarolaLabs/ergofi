import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run, parseCommandLineArgs } from './swap';
import * as moduleFunctions from './swap';
import type { ErgoBoxCustom, ErgopayPayCmdResponse } from './swap.types';

const userBoxes: ErgoBoxCustom[] = [
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

// {
//     "boxId": "807e715029f3efba60ccf3a0f998ba025de1c22463c26db53287849ae4e31d3b",
//     "value": 602310307,
//     "ergoTree": "0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c",
//     "assets": [],
//     "creationHeight": 1443463,
//     "additionalRegisters": {},
//     "transactionId": "180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c",
//     "index": 0
// }

const oracleBoxes: ErgoBoxCustom[] = [
	{
		additionalRegisters: {
			R4: '05e082b38607',
			R5: '0486b7b101'
		},
		address:
			'EfS5abyDe4vKFrJ48K5HnwTqa1ksn238bWFPe84bzVvCGvK1h2B7sgWLETtQuWwzVdBaoRZ1HcyzddrxLcsoM5YEy4UnqcLqMU1MDca1kLw9xbazAM6Awo9y6UVWTkQcS97mYkhkmx2Tewg3JntMgzfLWz5mACiEJEv7potayvk6awmLWS36sJMfXWgnEfNiqTyXNiPzt466cgot3GLcEsYXxKzLXyJ9EfvXpjzC2abTMzVSf1e17BHre4zZvDoAeTqr4igV3ubv2PtJjntvF2ibrDLmwwAyANEhw1yt8C8fCidkf3MAoPE6T53hX3Eb2mp3Xofmtrn4qVgmhNonnV8ekWZWvBTxYiNP8Vu5nc6RMDBv7P1c5rRc3tnDMRh2dUcDD7USyoB9YcvioMfAZGMNfLjWqgYu9Ygw2FokGBPThyWrKQ5nkLJvief1eQJg4wZXKdXWAR7VxwNftdZjPCHcmwn6ByRHZo9kb4Emv3rjfZE',
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
		globalIndex: 46081607,
		inclusionHeight: 1453503,
		index: 0,
		spentTransactionId: null,
		transactionId: 'e3d31aed0c8f07b3d710676cdfbbf324dfedf6f038853c2bbd4e153bc47d1f1a',
		value: 4147250000
	}
];
const bankBoxes: ErgoBoxCustom[] = [
	{
		additionalRegisters: {
			R4: '05cae2f42a',
			R5: '05e0febde918'
		},
		address:
			'MUbV38YgqHy7XbsoXWF5z7EZm524Ybdwe5p9WDrbhruZRtehkRPT92imXer2eTkjwPDfboa1pR3zb3deVKVq3H7Xt98qcTqLuSBSbHb7izzo5jphEpcnqyKJ2xhmpNPVvmtbdJNdvdopPrHHDBbAGGeW7XYTQwEeoRfosXzcDtiGgw97b2aqjTsNFmZk7khBEQywjYfmoDc9nUCJMZ3vbSspnYo3LarLe55mh2Np8MNJqUN9APA6XkhZCrTTDRZb1B4krgFY1sVMswg2ceqguZRvC9pqt3tUUxmSnB24N6dowfVJKhLXwHPbrkHViBv1AKAJTmEaQW2DN1fRmD9ypXxZk8GXmYtxTtrj3BiunQ4qzUCu1eGzxSREjpkFSi2ATLSSDqUwxtRz639sHM6Lav4axoJNPCHbY8pvuBKUxgnGRex8LEGM8DeEJwaJCaoy8dBw9Lz49nq5mSsXLeoC4xpTUmp47Bh7GAZtwkaNreCu74m9rcZ8Di4w1cmdsiK1NWuDh9pJ2Bv7u3EfcurHFVqCkT3P86JUbKnXeNxCypfrWsFuYNKYqmjsix82g9vWcGMmAcu5nagxD4iET86iE2tMMfZZ5vqZNvntQswJyQqv2Wc6MTh4jQx1q2qJZCQe4QdEK63meTGbZNNKMctHQbp3gRkZYNrBtxQyVtNLR8xEY8zGp85GeQKbb37vqLXxRpGiigAdMe3XZA4hhYPmAAU5hpSMYaRAjtvvMT3bNiHRACGrfjvSsEG9G2zY5in2YWz5X9zXQLGTYRsQ4uNFkYoQRCBdjNxGv6R58Xq74zCgt19TxYZ87gPWxkXpWwTaHogG1eps8WXt8QzwJ9rVx6Vu9a5GjtcGsQxHovWmYixgBU8X9fPNJ9UQhYyAWbjtRSuVBtDAmoV1gCBEPwnYVP5GCGhCocbwoYhZkZjFZy6ws4uxVLid3FxuvhWvQrVEDYp7WRvGXbNdCbcSXnbeTrPMey1WPaXX',
		assets: [
			{
				amount: 9999955003228,
				tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'
			},
			{
				amount: 9996668166225,
				tokenId: '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0'
			},
			{
				amount: 1,
				tokenId: '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9'
			}
		],
		boxId: '9f49ce511e5cf48d892cba74ce2a074c3282ebe69405b622692f50c2a38a76f6',
		creationHeight: 1453454,
		ergoTree:
			'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329',
		globalIndex: 46080691,
		inclusionHeight: 1453457,
		index: 0,
		spentTransactionId: null,
		transactionId: '989a0fb6712df4aedd005316f9119c6a1b048a6b2e1e20768860aa36379d54e3',
		value: 1649258599986982
	}
];

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
		if (url.includes('utxo')) return new Response(JSON.stringify(userBoxes));
		if (url.includes('oracle')) return new Response(JSON.stringify(oracleBoxes));
		if (url.includes('bank')) return new Response(JSON.stringify(bankBoxes));
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
		const result = await moduleFunctions.fetchUtxoByAddress('some-address');
		expect(result).toEqual(userBoxes);
	});

	it('fetchOracleCandidateBoxes should return oracle boxes', async () => {
		const result = await moduleFunctions.fetchOracleCandidateBoxes('erg_usd');
		expect(result).toEqual(oracleBoxes);
	});

	it('fetchSigmaUsdBankBoxCandidates should return bank boxes', async () => {
		const result = await moduleFunctions.fetchSigmaUsdBankBoxCandidates();
		expect(result).toEqual(bankBoxes);
	});
});

describe('run()', () => {
	it('should return an error when swap fails', async () => {
		const mockInput = {
			swapPair: 'ERG/SIGUSD',
			amount: 1000000000,
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
			amount: 500,
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
