import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { TransactionBuilder, OutputBuilder, ErgoAddress } from '@fleet-sdk/core';
import { vitestErgoTrees, vitestTokenIds } from '../dexyConstants';
import { compileContract } from '../compile';

//
// ----------------------------------------------------------------
// 1) Replace these placeholders with your *actual* token IDs.
// 2) Replace the ergoTrees with real compiled scripts, if you have them.
// 3) Adjust or rename constants as needed.
// ----------------------------------------------------------------
const { bankNFT, buybackNFT, oraclePoolNFT, freeMintNFT, lpNFT, lpToken, dexyUSD } = vitestTokenIds;

// Sample placeholders for script addresses (ergoTrees).
// You must replace these with your real compiled scripts:

const {
	bankErgoTree,
	freeMintErgoTree,
	buybackErgoTree,
	oracleErgoTree, // <====???
	lpErgoTree
} = vitestErgoTrees;

const dummyErgoTree = ErgoAddress.fromBase58(compileContract('sigmaProp(true)')).ergoTree; // trivial script

// Common constants from your Scala code:
const fakeNanoErgs = 10_000_000_000_000n;
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

describe('FreeMintSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		// Start from a certain height, e.g. 1,000,000
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	// --------------------------------------------------------
	// Utility: create the “main” parties we'll typically use
	// --------------------------------------------------------
	function setupParties() {
		const fundingParty = mockChain.addParty(dummyErgoTree, 'Funding');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank-Box');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint-Box');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback-Box');
		const oracleParty = mockChain.addParty(oracleErgoTree, 'Oracle-Box');
		const lpParty = mockChain.addParty(lpErgoTree, 'LP-Box');
		const userParty = mockChain.newParty('User / Change');
		return {
			fundingParty,
			bankParty,
			freeMintParty,
			buybackParty,
			oracleParty,
			lpParty,
			userParty
		};
	}

	// A small helper so we do not repeat the same big chunk of parameters
	function commonParams() {
		const oracleRateXy = 10_000n * 1_000_000n; // 10000 * 1000000
		const bankFeeNum = 3n; // implies 0.5% fee
		const buybackFeeNum = 2n; // also 0.5% fee
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n; // 10030
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n; // 20

		// Some large “LP” numbers (from your Scala test):
		const lpBalance = 100_000_000n;
		const lpReservesX = 100_000_000_000_000n;
		const lpReservesY = 10_000_000_000n;

		return {
			oracleRateXy,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			bankRate,
			buybackRate,
			lpBalance,
			lpReservesX,
			lpReservesY
		};
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 1) Free mint (remove Dexy, add Ergs) should work
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint (remove Dexy from and add Ergs to bank) should work (happy path)', () => {
		const {
			fundingParty,
			bankParty,
			freeMintParty,
			buybackParty,
			oracleParty,
			lpParty,
			userParty
		} = setupParties();

		const { bankRate, buybackRate } = commonParams();

		// Example minted
		const dexyMinted = 35_000n;

		// Additional details from your Scala code
		const bankReservesXIn = 100_000_000_000_000n;
		const bankReservesYIn = 90_200_000_100n;
		const bankReservesXOut = bankReservesXIn + bankRate * dexyMinted;
		const bankReservesYOut = bankReservesYIn - dexyMinted;

		// freeMint box: we remove minted Dexy from it
		const remainingDexyIn = 10_000_000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// buyback box gets some extra Ergs
		const buybackErgsAdded = buybackRate * dexyMinted;
		const buybackInitialErgs = fakeNanoErgs;
		const buybackFinalErgs = buybackInitialErgs + buybackErgsAdded;

		// 2. Add balances
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			// If you track registers, you'd do so in a custom extension:
			// registers: [ ... ]
		});
		buybackParty.addBalance({
			nanoergs: buybackInitialErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});
		lpParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: 100_000_000n },
				{ tokenId: dexyUSD, amount: 10_000_000_000n }
			]
		});

		// 3. Build transaction
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos,
					...lpParty.utxos
				],
				{ ensureInclusion: true }
			)
			// freeMint out (unchanged script, updated Dexy)
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n }
				])
				// If you needed to store updated registers, place them here
			)
			// bank out
			.to(
				new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
					{ tokenId: bankNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: bankReservesYOut }
				])
			)
			// buyback out
			.to(
				new OutputBuilder(buybackFinalErgs, buybackParty.address).addTokens([
					{ tokenId: buybackNFT, amount: 1n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		// 4. Execute
		const executed = mockChain.execute(tx);
		expect(executed).toBe(true);

		// Additional checks (bank final Dexy, etc.)
		const bankBal = bankParty.balance;
		expect(bankBal.tokens).toContainEqual({
			tokenId: dexyUSD,
			amount: bankReservesYOut
		});
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 2) Free mint should fail if Bank Dexy token id changed
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if Bank Dexy token id changed', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();
		const { bankRate, buybackRate } = commonParams();

		const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

		// We'll sabotage the bank box to produce a dummy token ID instead of the real Dexy
		const dexyMinted = 35_000n;
		const bankReservesXIn = 100_000_000_000_000n;
		const bankReservesYIn = 90_200_000_100n;
		const bankReservesXOut = bankReservesXIn + bankRate * dexyMinted;
		// Instead of subtracting Dexy from the bank, we'll do a “dummy” token
		// or we do the same logic but the final output has dummy token id:

		// 1. Add initial balances
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// 2. Build sabotage tx
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// freeMint out
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n }
				])
			)
			// bank out - sabotage Dexy -> dummyTokenId
			.to(
				new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
					{ tokenId: bankNFT, amount: 1n },
					{ tokenId: dummyTokenId, amount: 90_200_000_100n - dexyMinted }
				])
			)
			// buyback out (just do something minimal)
			.to(
				new OutputBuilder(fakeNanoErgs, buybackParty.address).addTokens([
					{ tokenId: buybackNFT, amount: 1n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		// 3. Attempt execution => should fail
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 3) Free mint should fail if Bank box script changed
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if Bank box script changed', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();
		const { bankRate, buybackRate } = commonParams();

		const dexyMinted = 35_000n;
		const bankReservesXIn = 100_000_000_000_000n;
		const bankReservesYIn = 90_200_000_100n;
		const bankReservesXOut = bankReservesXIn + bankRate * dexyMinted;
		const bankReservesYOut = bankReservesYIn - dexyMinted;

		// Add input UTXOs
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// We sabotage the “bank out” box to have a different ergoTree script,
		// e.g. userParty.address instead of bankParty.address.
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// freeMint out (unchanged)
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n }
				])
			)
			// bank out => WRONG script => userParty instead
			.to(
				new OutputBuilder(bankReservesXOut, userParty.address).addTokens([
					{ tokenId: bankNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: bankReservesYOut }
				])
			)
			// buyback out
			.to(
				new OutputBuilder(fakeNanoErgs + buybackRate * dexyMinted, buybackParty.address).addTokens([
					{ tokenId: buybackNFT, amount: 1n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 4) Free mint should fail if FreeMint box script changed
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if FreeMint box script changed', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();
		const { bankRate, buybackRate } = commonParams();

		const dexyMinted = 35_000n;

		// sabotage the “freeMint” out box to be userParty’s script
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// freeMint out => WRONG address
			.to(
				new OutputBuilder(minStorageRent, userParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n }
				])
			)
			// bank out, buyback out, etc. can be correct
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 5) Free mint should fail if wrong LP NFT
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong LP NFT', () => {
		const {
			fundingParty,
			lpParty,
			bankParty,
			freeMintParty,
			buybackParty,
			oracleParty,
			userParty
		} = setupParties();
		const { bankRate, buybackRate } = commonParams();

		// We'll sabotage the LP box with a dummy NFT instead of the real `lpNFT`
		const dummyTokenId = '59e5ce5aa0d95f5d54a...';

		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		lpParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, // WRONG
				{ tokenId: lpToken, amount: 100_000_000n },
				{ tokenId: dexyUSD, amount: 10_000_000_000n }
			]
		});
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...lpParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// Just do minimal outputs; the presence of the wrong NFT in the LP input
			// should cause the contract to fail.
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 6) Free mint should fail if wrong Oracle NFT
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong Oracle NFT', () => {
		const { fundingParty, oracleParty, bankParty, freeMintParty, buybackParty, userParty } =
			setupParties();

		const dummyTokenId = '59e5ce5aa0d95f5d54a...';

		// sabotage => oracle box with the dummy instead of the real oraclePoolNFT
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n } // WRONG
			]
		});
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});

		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...oracleParty.utxos,
					...fundingParty.utxos,
					...bankParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos
				],
				{ ensureInclusion: true }
			)
			// sabotage => everything else is normal,
			// but the Oracle NFT in the input is wrong -> contract must fail
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 7) Free mint should fail if wrong Bank NFT in but right Bank NFT out
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong Bank NFT in but right Bank NFT out', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();

		const dummyTokenId = '59e5ce5aa0d95f5d54a...';
		// sabotage => Bank box holds a dummy NFT instead of bankNFT
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, // WRONG in
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [
				// We might hold the real bankNFT here, but it's not in the real bank box
				// -> mismatch => fail
				{ tokenId: bankNFT, amount: 1n }
			]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...bankParty.utxos,
					...fundingParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// bank out => correct (bankNFT) but the input had the wrong NFT => fail
			.to(
				new OutputBuilder(100_000_000_010_000n, bankParty.address).addTokens([
					{ tokenId: bankNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: 90_200_000_000n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 8) Free mint should fail if wrong Bank NFT
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong Bank NFT', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();

		const dummyTokenId = '59e5ce5aa0d95f5d54a...';

		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// sabotage => we produce a bank out with dummy NFT instead of bankNFT
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...bankParty.utxos,
					...fundingParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			.to(
				new OutputBuilder(100_000_000_010_000n, bankParty.address).addTokens([
					{ tokenId: dummyTokenId, amount: 1n }, // WRONG out
					{ tokenId: dexyUSD, amount: 90_200_000_000n }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 9) Free mint should fail if wrong FreeMint NFT in but right FreeMint NFT out
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong FreeMint NFT in but right FreeMint NFT out', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();

		const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';
		// sabotage => freeMint box has dummy token instead of freeMintNFT
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n } // WRONG in
			]
		});
		// Meanwhile, we do have the real freeMintNFT in the “funding” box,
		// or we produce it out in the final
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// final “freeMint out” might have the real NFT,
		// but the *input* freeMint box was wrong -> fail
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...freeMintParty.utxos,
					...fundingParty.utxos,
					...bankParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: freeMintNFT, amount: 1n } // right NFT out
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 10) Free mint should fail if wrong FreeMint NFT
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail if wrong FreeMint NFT', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();

		const dummyTokenId = '59e5ce5aa0d95f5d54a7bc89c46730d9662397...';

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// sabotage => freeMint out with dummy NFT instead of real
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...fundingParty.utxos,
					...freeMintParty.utxos,
					...bankParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			.to(
				new OutputBuilder(minStorageRent, freeMintParty.address).addTokens([
					{ tokenId: dummyTokenId, amount: 1n } // WRONG
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// 11) Free mint should fail for negative dexy minted
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	it('Free mint should fail for negative dexy minted', () => {
		const { fundingParty, bankParty, freeMintParty, buybackParty, oracleParty, userParty } =
			setupParties();
		const { bankRate, buybackRate } = commonParams();

		// sabotage => minted Dexy is negative => impossible scenario
		// We'll replicate enough logic so the contract tries to do it,
		// but fails the check
		const dexyMinted = -35_000n; // negative

		bankParty.addBalance({
			nanoergs: 100_000_000_000_000n,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 90_200_000_100n }
			]
		});
		// We might try to fund "extra Dexy" from somewhere:
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			// If you wanted to say "we need to add the negative minted Dexy"?
			// It's not physically possible, but we'll put a large Dexy so
			// there's an attempt:
			tokens: [{ tokenId: dexyUSD, amount: 1_000_000_000n }]
		});
		freeMintParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: dummyNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
		});

		// Build the sabotage tx => “mint” negative Dexy
		// -> contract logic sees it as invalid
		const tx = new TransactionBuilder(mockChain.height)
			.from(
				[
					...bankParty.utxos,
					...fundingParty.utxos,
					...freeMintParty.utxos,
					...buybackParty.utxos,
					...oracleParty.utxos
				],
				{ ensureInclusion: true }
			)
			// We'll keep a normal shape, but the negative minted Dexy
			// should cause the script to fail
			.to(
				new OutputBuilder(100_000_000_010_000n, bankParty.address).addTokens([
					{ tokenId: bankNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: 90_200_000_100n - dexyMinted }
				])
			)
			.payFee(fee)
			.sendChangeTo(userParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
