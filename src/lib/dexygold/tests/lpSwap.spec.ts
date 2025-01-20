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
	// ------------------------------------------------------------------------------------
	// Mock chain setup
	// ------------------------------------------------------------------------------------
	const mockChain = new MockChain({ height: 1_000_000 });

	// Parties that will participate in the test.
	// In practice, you might have more or fewer parties:
	const fundingParty = mockChain.newParty('Funding');
	const lpParty = mockChain.newParty('LP-Box Owner');
	const swapParty = mockChain.newParty('Swap-Box Owner');
	const userParty = mockChain.newParty('User / Change'); // user who receives the bought tokens

	// Example token IDs (dummy 64-char hex strings). Replace with real ones:
	const lpNFT = '000111222333444555666777888999aaa000111222333444555666777888999aa';
	const lpToken = '111222333444555666777888999aaa000111222333444555666777888999aaa00';
	const dexyUSD = '222333444555666777888999aaa000111222333444555666777888999aaa00111';
	const lpSwapNFT = '333444555666777888999aaa000111222333444555666777888999aaa00111222';

	// If your LP or Swap scripts need compilation, you can do something like:
	// const lpErgoTree = compile('pk(...)', {...});
	// const swapErgoTree = compile('pk(...)', {...});
	// For demo here, we’ll just assume these are placeholders:
	const lpErgoTree = compile('sigmaProp(true)', {});
	const swapErgoTree = compile('sigmaProp(true)', {});
	const dummyErgoTree = compile('sigmaProp(true)', {});

	// Some constants from your Scala code:
	const fakeNanoErgs = 10_000_000_000_000n; // 10k Erg for funding
	const dummyNanoErgs = 100_000n;
	const minStorageRent = 1000000n; // 0.001 Erg
	const fee = 1_000_000n; // 0.001 Erg transaction fee
	// Typically these come from your DexySpec:
	const feeNumLp = 995n;
	const feeDenomLp = 1000n;

	// Scala snippet values:
	const lpBalance = 100_000_000n; // total supply of LP token
	const reservesXIn = 1_000_000_000_000n; // Erg in the pool
	const reservesYIn = 100_000_000n; // Dexy in the pool
	const sellX = 10_000_000n; // user sells 0.01 Erg

	// ------------------------------------------------------------------------------------
	// Before/After hooks
	// ------------------------------------------------------------------------------------
	beforeEach(() => {
		mockChain.reset();
	});

	afterEach(() => {
		mockChain.reset();
	});

	// ------------------------------------------------------------------------------------
	// The test translating "Swap (sell Ergs) should work - w. simple input"
	// ------------------------------------------------------------------------------------
	it('Swap (sell Ergs) should work - w. simple input', () => {
		//
		// 1) Replicate the core math from Scala:
		//
		const rate = Number(reservesYIn) / Number(reservesXIn);
		// buyY = (sellX * rate * feeNumLp / feeDenomLp) - 1
		// be mindful of BigInt vs Number if the amounts are large
		let calculatedBuyY =
			BigInt(Math.floor((Number(sellX) * rate * Number(feeNumLp)) / Number(feeDenomLp))) - 1n;

		// For the given numbers in Scala, buyY = 996
		expect(calculatedBuyY).toBe(996n);

		const reservesXOut = reservesXIn + sellX; // new pool Erg
		const reservesYOut = reservesYIn - calculatedBuyY; // new pool Dexy

		const deltaReservesX = reservesXOut - reservesXIn;
		const deltaReservesY = reservesYOut - reservesYIn;

		// Condition from Scala test:
		// BigInt(reservesYIn) * deltaReservesX * feeNumLp >=
		//  -deltaReservesY * (BigInt(reservesXIn) * feeDenomLp + deltaReservesX * feeNumLp)
		const lhs = reservesYIn * deltaReservesX * feeNumLp;
		const rhs = -deltaReservesY * (reservesXIn * feeDenomLp + deltaReservesX * feeNumLp);

		expect(lhs >= rhs).toBe(true);

		//
		// 2) Mock UTxOs:
		//    - fundingBox
		//    - lpBox
		//    - swapBox
		//
		// We will deposit them into three separate "parties" so we can easily
		// combine them as Transaction inputs.
		//

		// fundingBox (contains fakeErgs):
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});

		// lpBox (contains the LP NFT, pool tokens, etc.):
		lpParty.addBalance({
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		// swapBox (contains the LP Swap NFT):
		swapParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpSwapNFT, amount: 1n }]
		});

		//
		// 3) Build the transaction that consumes the above 3 boxes
		//    and produces:
		//    - updated LP box
		//    - updated swap box
		//    - user output box with bought Dexy
		//
		const height = mockChain.height;

		const tx = new TransactionBuilder(height)
			// All input boxes
			.from([...fundingParty.utxos, ...lpParty.utxos, ...swapParty.utxos])

			// updated LP box
			.to(
				new OutputBuilder(
					reservesXOut, // new Erg amount
					lpErgoTree // contract for LP
				).addTokens([
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesYOut }
				])
			)

			// updated Swap box
			.to(
				new OutputBuilder(
					minStorageRent, // same as input
					swapErgoTree
				).addTokens([{ tokenId: lpSwapNFT, amount: 1n }])
			)

			// user output box with Dexy
			.to(
				new OutputBuilder(
					dummyNanoErgs, // minimal Erg
					userParty.address
				).addTokens([{ tokenId: dexyUSD, amount: calculatedBuyY }])
			)

			// pay fee
			.payFee(fee)

			// send change back to... let's say fundingParty
			.sendChangeTo(fundingParty.address)
			.build();

		//
		// 4) Execute the transaction in the mock chain
		//
		// In your real test, you might sign with appropriate keys.
		// If all scripts are sigmaProp(true) as placeholders, any signature is fine.
		//
		const executed = mockChain.execute(tx, {
			// signers: [fundingParty, lpParty, swapParty] etc.
			signers: [fundingParty, lpParty, swapParty]
			// throw: false // set to false if you want "execute" to return false instead of throwing
		});

		// The Scala test checks "no exception should be thrown"
		// So here we ensure the transaction is valid:
		expect(executed).toBe(true);

		//
		// 5) (Optional) Check final balances
		//    - The updated LP box is now "locked" in the contract's new UTxO
		//    - The user must have the Dexy tokens
		//
		// We can do basic checks:
		const userBalance = userParty.balance;
		expect(userBalance.tokens).toContainEqual({
			tokenId: dexyUSD,
			amount: calculatedBuyY
		});
		// etc.
	});
});
