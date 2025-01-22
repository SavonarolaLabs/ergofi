import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SLong, SInt, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { vitestErgoTrees, vitestTokenIds } from '../../dexyConstants';

const { lpNFT, lpToken, lpMintNFT, dexyUSD } = vitestTokenIds;
const { lpErgoTree, lpMintErgoTree, fakeScriptErgoTree } = vitestErgoTrees;

const initialLp = 100000000000n;
const fakeNanoErgs = 10000000000000n;
const dummyNanoErgs = 100000n;
const minStorageRent = 1000000n;
const fee = 1000000n;

describe('LpMintSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Mint Lp (deposit Ergs and Dexy) should work', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;
		expect(sharesUnlocked).toBe(49950n);
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Mint Lp should fail if more LP taken', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked =
			(sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY) + 1n;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Mint Lp should fail if Lp address changed', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, fakeScriptErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Mint Lp should not work if more LP taken', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked =
			(sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY) + 1n;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Can deposit less amount of Dexy (Y tokens)', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 1n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;
		expect(sharesUnlocked).toBe(999n);
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Taking more LP should fail (when depositing less Dexy)', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 1n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked =
			(sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY) + 1n;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Can deposit less amount of Ergs (X tokens)', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 10000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked = sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY;
		expect(sharesUnlocked).toBe(999n);
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Taking more LP should fail (when depositing less Ergs)', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 10000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked =
			(sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY) + 1n;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Can take less LP tokens', () => {
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const depositX = 500000n;
		const depositY = 50n;
		const reservesXOut = reservesXIn + depositX;
		const reservesYOut = reservesYIn + depositY;
		const supplyLpIn = initialLp - lpBalanceIn;
		const sharesUnlockedX = (depositX * supplyLpIn) / reservesXIn;
		const sharesUnlockedY = (depositY * supplyLpIn) / reservesYIn;
		const sharesUnlocked =
			(sharesUnlockedX < sharesUnlockedY ? sharesUnlockedX : sharesUnlockedY) - 1n;
		const lpBalanceOut = lpBalanceIn - sharesUnlocked;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const lpMintParty = mockChain.addParty(lpMintErgoTree, 'LpMint');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: depositY }]
		});

		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		lpMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpMintNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const lpMintOut = new OutputBuilder(minStorageRent, lpMintParty.address).addTokens([
			{ tokenId: lpMintNFT, amount: 1n }
		]);

		const dummyOut = new OutputBuilder(dummyNanoErgs, fundingParty.address).addTokens([
			{ tokenId: lpToken, amount: sharesUnlocked }
		]);

		const mainInputs = [...lpParty.utxos, ...lpMintParty.utxos, ...fundingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(lpOut)
			.to(lpMintOut)
			.to(dummyOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
});
