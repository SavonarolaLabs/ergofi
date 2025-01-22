import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { SLong, SInt, SBool, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { vitestErgoTrees, vitestTokenIds } from '../../dexyConstants';

const { oraclePoolNFT, tracking101NFT, extractionNFT, lpNFT, lpToken, dexyUSD } = vitestTokenIds;

const { fakeScriptErgoTree, extractScriptErgoTree, lpErgoTree } = vitestErgoTrees;

const fakeNanoErgs = 10000000000000n;
const dummyNanoErgs = 100000n;
const minStorageRent = 1000000n;
const fee = 1000000n;
const changeAddress = fakeScriptErgoTree;

describe('ReverseExtractSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Reverse Extract (remove Dexy from extract box and put in Lp box) should work', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const T_delay = 360;
		const T_release = 2;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const deltaDexy = -350000000n;
		const lpReservesXOut = lpReservesXIn;
		const lpReservesYOut = lpReservesYIn - deltaDexy;
		const lpBalanceOut = lpBalanceIn;
		const extractBoxDexyIn = 90200000100n;
		const extractBoxDexyOut = extractBoxDexyIn + deltaDexy;
		const trackingHeight = BigInt(mockChain.height) - BigInt(T_release) - 1n;
		const extractBoxCreationHeightIn = BigInt(mockChain.height) - BigInt(T_delay) - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree);
		const oracleParty = mockChain.addParty(fakeScriptErgoTree);
		const tracking101Party = mockChain.addParty(fakeScriptErgoTree);
		const lpParty = mockChain.addParty(lpErgoTree);
		const extractParty = mockChain.addParty(extractScriptErgoTree);
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		tracking101Party.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(101).toHex(),
				R5: SInt(100).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		extractParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [
					{ tokenId: extractionNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: extractBoxDexyIn }
				]
			},
			{ R4: SInt(Number(extractBoxCreationHeightIn)).toHex() }
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const extractOut = new OutputBuilder(minStorageRent, extractParty.address).addTokens([
			{ tokenId: extractionNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: extractBoxDexyOut }
		]);
		const mainInputs = [...lpParty.utxos, ...extractParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...tracking101Party.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(extractOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
});
