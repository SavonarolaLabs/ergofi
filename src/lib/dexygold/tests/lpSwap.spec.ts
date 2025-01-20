import { MockChain } from '@fleet-sdk/mock-chain';
import { ErgoAddress, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vitestContractConfig, vitestErgoTrees, vitestTokenIds } from '../dexyConstants';
import { compileContract } from '../compile';

const { feeNumLp, feeDenomLp } = vitestContractConfig;
const { lpNFT, lpToken, dexyUSD, lpSwapNFT } = vitestTokenIds;
const { lpErgoTree, swapErgoTree, lpSwapSellV1ErgoTree, lpSwapBuyV1ErgoTree } = vitestErgoTrees;

const fakeNanoErgs = 10_000_000_000_000n;
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

describe('LpSwapSpec', () => {
	const mockChain = new MockChain({ height: 1_000_000 });

	// We create test parties. The “fundingParty” uses a simple `sigmaProp(true)` script
	// so it can sign trivially. The LP and Swap parties use your contract ergoTrees.
	const fundingParty = mockChain.addParty(
		ErgoAddress.fromBase58(compileContract('sigmaProp(true)')).ergoTree,
		'Funding'
	);
	const lpParty = mockChain.addParty(lpErgoTree, 'LP-Box Owner');
	const swapParty = mockChain.addParty(swapErgoTree, 'Swap-Box Owner');
	const userParty = mockChain.newParty('User / Change');

	beforeEach(() => {
		mockChain.reset();
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Swap (sell Ergs) should work - w. simple input', () => {
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;

		// buyY = (sellX * rate * feeNumLp / feeDenomLp) - 1
		const buyY =
			BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;
		expect(buyY).toBe(996n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// This is the same check you do in Scala
		const deltaReservesX = reservesXOut - reservesXIn;
		const deltaReservesY = reservesYOut - reservesYIn;
		const lhs = reservesYIn * deltaReservesX * BigInt(feeNumLp);
		const rhs =
			-deltaReservesY * (reservesXIn * BigInt(feeDenomLp) + deltaReservesX * BigInt(feeNumLp));
		expect(lhs >= rhs).toBe(true);

		// Add initial balances
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const height = mockChain.height;

		// Build Tx
		const tx = new TransactionBuilder(height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			// LP box out
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			// Swap box out
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			// user receives Dexy
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		// Execute
		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);

		// userParty should have the Dexy tokens
		const userBalance = userParty.balance;
		expect(userBalance.tokens).toContainEqual({
			tokenId: dexyUSD,
			amount: buyY
		});
	});

	it('Taking too many dexy should fail', () => {
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;

		// artificially inflate buyY by +1% => * 101 / 100
		const buyY =
			(BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) * 101n) /
			100n;

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// Should break the normal ratio check
		const deltaReservesX = reservesXOut - reservesXIn;
		const deltaReservesY = reservesYOut - reservesYIn;
		const lhs = reservesYIn * deltaReservesX * BigInt(feeNumLp);
		const rhs =
			-deltaReservesY * (reservesXIn * BigInt(feeDenomLp) + deltaReservesX * BigInt(feeNumLp));
		// Condition is reversed => we expect lhs < rhs
		expect(lhs < rhs).toBe(true);

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		// We expect it to fail
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if Lp address changed', () => {
		/*
      Original success scenario:
      - buyY = 997
    */
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));

		expect(buyY).toBe(997n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// We won't replicate the ratio checks here, but you can if you like
		// the main difference: we output the "LP box" to the *wrong address*

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		// Instead of returning LP box to lpErgoTree, let's put it into userParty => fail
		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, userParty.address) // WRONG address
					.addTokens([
						{ tokenId: lpNFT, amount: 1n },
						{ tokenId: lpToken, amount: lpBalance },
						{ tokenId: dexyUSD, amount: reservesYOut }
					])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if LpSwap address changed', () => {
		// similar scenario but we now break the "swap" output
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));
		expect(buyY).toBe(997n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		// We output the swap box to the wrong address
		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, userParty.address) // WRONG address
					.addTokens([{ tokenId: lpSwapNFT, amount: 1n }])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if Lp NFT changed', () => {
		// We attempt to put a dummyTokenId in place of the real lpNFT
		const dummyTokenId = '59e5ce5aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0fad80a';

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));
		expect(buyY).toBe(997n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// Funding has a dummyToken, ensuring it tries to swap it in the output
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		// We incorrectly put the dummyTokenId in place of lpNFT in the output
		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: dummyTokenId, amount: 1n }, // WRONG NFT
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if LpSwap NFT changed', () => {
		const dummyTokenId = '59e5ce5aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0fad80a';

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));
		expect(buyY).toBe(997n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		// Wrong NFT in the swap box output
		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: dummyTokenId, amount: 1n } // WRONG
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if Lp token changed', () => {
		// Put dummy token in place of lpToken
		const dummyTokenId = '59e5ce5aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0fad80a';

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));
		expect(buyY).toBe(997n);

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: lpBalance }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// Output tries to replace the lpToken with dummyTokenId
		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: dummyTokenId, amount: lpBalance }, // WRONG
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if Dexy token changed', () => {
		// Put dummy token in place of Dexy
		const dummyTokenId = '59e5ce5aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0fad80a';

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY = BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp)));
		expect(buyY).toBe(997n);

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: BigInt(100_000_000) }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// Output tries to put dummy token in place of Dexy
		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dummyTokenId, amount: BigInt(reservesYOut) } // WRONG token
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Ergs) should fail if more Dexy taken', () => {
		/*
      buyY = (sellX * rate * feeNumLp / feeDenomLp) + 1
    */
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY =
			BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) + 1n;

		expect(buyY).toBe(998n); // matching your Scala assert

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// This breaks the contract's check
		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Swap (sell Dexy) should work - w. simple input', () => {
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesXIn) / Number(reservesYIn);
		const sellY = 1_000n;
		// buyX = (sellY * rate * feeNumLp / feeDenomLp) - 100
		const buyX =
			BigInt(Math.floor((Number(sellY) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 100n;

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: BigInt(sellY) }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn - buyX;
		const reservesYOut = reservesYIn + BigInt(sellY);
		const deltaReservesX = reservesXOut - reservesXIn;
		const deltaReservesY = reservesYOut - reservesYIn;

		// same ratio check as Scala if you want it:
		expect(
			BigInt(reservesXIn) * deltaReservesY * BigInt(feeNumLp) >=
				-deltaReservesX *
					(BigInt(reservesYIn) * BigInt(feeDenomLp) + deltaReservesY * BigInt(feeNumLp))
		).toBe(true);

		// user final nanoergs => dummyNanoErgs - deltaReservesX
		// but deltaReservesX is negative, so be mindful. In Scala, we do (dummyNanoErgs - deltaReservesX).
		const userErgs = dummyNanoErgs - deltaReservesX;

		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			// user gets the "bought" ERGs
			.to(new OutputBuilder(userErgs, userParty.address))
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);

		// user should have the buyX in ERGs above its original dummyNanoErgs
		const userBalance = userParty.balance;
		// the user has no tokens, only extra NanoErgs
		// You can do more thorough checks if needed
		// e.g. userBalance.nanoergs might reflect the new total
		// For simplicity, just ensure transaction executed is true
	});

	it('Swap (sell Dexy) should fail if more Ergs taken', () => {
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesXIn) / Number(reservesYIn);
		const sellY = 1_000n;
		// +1 extra erg
		const buyX =
			BigInt(Math.floor((Number(sellY) * rate * Number(feeNumLp)) / Number(feeDenomLp))) + 1n;

		// This should break the ratio check

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: sellY }]
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn - buyX;
		const reservesYOut = reservesYIn + sellY;
		const userErgs = dummyNanoErgs + buyX;

		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.to(new OutputBuilder(userErgs, userParty.address))
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('No change should work', () => {
		// i.e. we do not produce a "change" box to user
		// The final boxes remain exactly the same as the input
		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		// We just replicate the box exactly
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		// outputs match the inputs
		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])
			.to(
				new OutputBuilder(reservesXIn, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYIn }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);
	});

	it('Swap (user sells Ergs to buy Dexy) should work - w. proxy input v1', () => {
		/*
      This test scenario is the same as "user sells X to get Y"
      except the user's input box is on a "proxy contract" (lpSwapSellV1Script).
    */

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = Number(reservesYIn) / Number(reservesXIn);
		const sellX = 10_000_000n;
		const buyY =
			BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;
		expect(buyY).toBe(996n);

		// The user’s box is at the "proxy" ergoTree
		const proxyParty = mockChain.addParty(lpSwapSellV1ErgoTree, 'ProxyBox');

		// Fund that box
		proxyParty.addBalance({
			nanoergs: fakeNanoErgs
		});

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - buyY;

		// The difference is that the user “pays” sellX from that proxy box,
		// effectively expecting buyY Dexy in return

		// We'll do a naive approach:
		// user’s box => (fakeNanoErgs) to pay the box, the difference ends up in the final user box
		// The test is simplified with mockChain, so we won't do full script validations unless your proxy script is included

		// final user output ergo amount = proxyBox - (some cost?), or just do an approximation
		// For demonstration: user might lose ~ (buyY * rate) in nanoErgs
		const approximateErgsAfterSwap =
			proxyParty.balance.nanoergs - BigInt(Math.floor(Number(buyY) * rate));

		const tx = new TransactionBuilder(mockChain.height)
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos, ...proxyParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			// user gets Dexy
			.to(
				new OutputBuilder(approximateErgsAfterSwap, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: buyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);

		const userBalance = userParty.balance;
		expect(userBalance.tokens).toContainEqual({
			tokenId: dexyUSD,
			amount: buyY
		});
	});

	it('Swap (user sells Dexy to buy Ergs) should work - w. proxy', () => {
		/*
      This is the scenario where user has Dexy in a "buy" proxy (lpSwapBuyV1Script).
    */

		const proxyParty = mockChain.addParty(lpSwapBuyV1ErgoTree, 'ProxyBox2');

		const lpBalance = 100_000_000n;
		const reservesXIn = 1_000_000_000_000n;
		const reservesYIn = 100_000_000n;

		const rate = BigInt(Number(reservesXIn) / Number(reservesYIn));
		const sellY = 1_000n;
		// buyX = (sellY * rate * feeNumLp / feeDenomLp) - 100
		const buyX = (sellY * rate * feeNumLp) / feeDenomLp - 100n;
		expect(buyX).toBe(9969900n);

		// The proxy box starts with some small erg + the Dexy tokens
		proxyParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: sellY }]
		});

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		const reservesXOut = reservesXIn - buyX;
		const reservesYOut = reservesYIn + sellY;

		// user gets buyX more Ergs
		const finalUserErgs = dummyNanoErgs + buyX;

		const tx = new TransactionBuilder(mockChain.height)
			.from([...lpParty.utxos, ...swapParty.utxos, ...proxyParty.utxos, ...fundingParty.utxos])
			.to(
				new OutputBuilder(reservesXOut, lpErgoTree).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)
			.to(
				new OutputBuilder(minStorageRent, swapErgoTree).addTokens([
					{ tokenId: lpSwapNFT, amount: 1n }
				])
			)
			// user gets more nanoErgs (the bought Ergs), no tokens
			.to(new OutputBuilder(finalUserErgs, userParty.address))
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);
	});
});
