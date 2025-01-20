import { MockChain } from '@fleet-sdk/mock-chain';
import { compile } from '@fleet-sdk/compiler';
import {
	SInt,
	SSigmaProp,
	SGroupElement,
	TransactionBuilder,
	OutputBuilder
} from '@fleet-sdk/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('LpSwapSpec', () => {
	const mockChain = new MockChain({ height: 1_000_000 });

	const fundingParty = mockChain.newParty('Funding');
	const lpParty = mockChain.newParty('LP-Box Owner');
	const swapParty = mockChain.newParty('Swap-Box Owner');
	const userParty = mockChain.newParty('User / Change');

	const lpNFT = '000111222333444555666777888999aaa000111222333444555666777888999aa';
	const lpToken = '111222333444555666777888999aaa000111222333444555666777888999aaa00';
	const dexyUSD = '222333444555666777888999aaa000111222333444555666777888999aaa00111';
	const lpSwapNFT = '333444555666777888999aaa000111222333444555666777888999aaa00111222';

	const lpErgoTree = compile('sigmaProp(true)', {});
	const swapErgoTree = compile('sigmaProp(true)', {});
	const dummyErgoTree = compile('sigmaProp(true)', {});

	const fakeNanoErgs = 10_000_000_000_000n;
	const dummyNanoErgs = 100_000n;
	const minStorageRent = 1000000n;
	const fee = 1_000_000n;
	const feeNumLp = 995n;
	const feeDenomLp = 1000n;

	const lpBalance = 100_000_000n;
	const reservesXIn = 1_000_000_000_000n;
	const reservesYIn = 100_000_000n;
	const sellX = 10_000_000n;

	beforeEach(() => {
		mockChain.reset();
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Swap (sell Ergs) should work - w. simple input', () => {
		const rate = Number(reservesYIn) / Number(reservesXIn);
		let calculatedBuyY =
			BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;

		expect(calculatedBuyY).toBe(996n);

		const reservesXOut = reservesXIn + sellX;
		const reservesYOut = reservesYIn - calculatedBuyY;

		const deltaReservesX = reservesXOut - reservesXIn;
		const deltaReservesY = reservesYOut - reservesYIn;

		const lhs = reservesYIn * deltaReservesX * feeNumLp;
		const rhs = -deltaReservesY * (reservesXIn * feeDenomLp + deltaReservesX * feeNumLp);

		expect(lhs >= rhs).toBe(true);

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

		const tx = new TransactionBuilder(height)
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
			.to(
				new OutputBuilder(dummyNanoErgs, userParty.address).addTokens([
					{ tokenId: dexyUSD, amount: calculatedBuyY }
				])
			)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, {
			signers: [fundingParty, lpParty, swapParty]
		});

		expect(executed).toBe(true);

		const userBalance = userParty.balance;
		expect(userBalance.tokens).toContainEqual({
			tokenId: dexyUSD,
			amount: calculatedBuyY
		});
	});
});
