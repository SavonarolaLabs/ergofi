// File: FreeMintSpec.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputBuilder, TransactionBuilder, ErgoUnsignedInput, SInt, SLong } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';

// --------------------------------------------------------------------
// Example placeholders for IDs, ergoTrees, etc. Replace with real data.
// --------------------------------------------------------------------
import { vitestTokenIds, vitestErgoTrees } from '../dexyConstants';

// Some placeholders or real references:
const { freeMintNFT, bankNFT, buybackNFT, oraclePoolNFT, lpNFT, lpToken, dexyUSD } = vitestTokenIds;

const { fakeScriptErgoTree, buybackErgoTree, bankErgoTree, freeMintErgoTree, lpErgoTree } =
	vitestErgoTrees;

const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

// Constants from Scala code:
const fakeNanoErgs = 10_000_000_000_000n; // large funding
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

// If you want to replicate the Scala "changeAddress" as "fakeScript":
const changeAddress = fakeScriptErgoTree;

describe('FreeMintSpec - Full Translation', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		// Start each test with a fresh chain at height ~1M
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	// ------------------------------------------------------------------------
	// 1) property("Free mint (remove Dexy from and adding Ergs to bank box) should work")
	// ------------------------------------------------------------------------
	it('Free mint (remove Dexy from and adding Ergs to bank box) should work', () => {
		const oracleRateXy = 10000n * 1000000n; // 10^10
		const bankFeeNum = 3n; // => 0.5% fee part
		const buybackFeeNum = 2n; // => 0.5% fee part
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n; // => 10030
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n; // => 20

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n; // positive
		const bankErgsAdded = bankRate * dexyMinted; // 10030 * 35000
		const buybackErgsAdded = buybackRate * dexyMinted; // 20 * 35000

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		// Registers in freeMintBox
		const resetHeightIn = BigInt(mockChain.height + 1);
		const resetHeightOut = resetHeightIn; // not reset
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties for each box
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// Setup inputs
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		// set context var for buyback
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		// main + data inputs
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		// Outputs
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		// Build TX
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		//console.dir(tx.toEIP12Object(), { depth: null });
		// Execute => should pass
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	// ------------------------------------------------------------------------
	// 2) property("Free mint should fail if Bank Dexy token id changed")
	// ------------------------------------------------------------------------
	it('Free mint should fail if Bank Dexy token id changed', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// Setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			// Scala used a dummy token in the funding box. We'll replicate:
			tokens: [{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) }]
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		// buyback context var
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		// build output that changes Dexy -> dummyTokenId
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) } // WRONG token
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false); // "Script reduced to false"
	});

	// ------------------------------------------------------------------------
	// 3) property("Free mint should fail if Bank box script changed")
	// ------------------------------------------------------------------------
	it('Free mint should fail if Bank box script changed', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),

				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		// buyback context
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// we produce a bankOut with a different script => changeAddress instead of bankParty.address
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, changeAddress) // WRONG script
			.addTokens([
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYOut }
			]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 4) property("Free mint should fail if FreeMint box script changed")
	// ------------------------------------------------------------------------
	it('Free mint should fail if FreeMint box script changed', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// freeMintOut => changed script address from freeMintParty => changeAddress
		const freeMintOut = new OutputBuilder(minStorageRent, changeAddress) // WRONG script
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 5) property("Free mint should fail if wrong LP NFT")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong LP NFT', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);

		// LP box with wrong NFT => dummyTokenId instead of lpNFT
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, // WRONG
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});

		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);

		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 6) property("Free mint should fail if wrong Oracle NFT")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong Oracle NFT', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});

		// WRONG oracle NFT => dummyTokenId
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }] // wrong
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);

		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 7) property("Free mint should fail if wrong Bank NFT in but right Bank NFT out")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong Bank NFT in but right Bank NFT out', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: bankNFT, amount: 1n }] // Just some funding with correct NFT
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);

		// Bank box with WRONG NFT in => dummyTokenId
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, // WRONG
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		// The Scala test has the correct bankNFT in the output, ironically, but input is wrong => fail
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n }, // correct out
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 8) property("Free mint should fail if wrong Bank NFT")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong Bank NFT', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }] // WRONG
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		// bankOut with WRONG NFT => dummyTokenId
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: dummyTokenId, amount: 1n }, // WRONG
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 9) property("Free mint should fail if wrong FreeMint NFT in but right FreeMint NFT out")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong FreeMint NFT in but right FreeMint NFT out', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: freeMintNFT, amount: 1n }]
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});

		// WRONG: freeMintBox has dummyTokenId instead of freeMintNFT
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }] // WRONG
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);

		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// freeMintOut => ironically correct NFT out
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }]) // correct out
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 10) property("Free mint should fail if wrong FreeMint NFT")
	// ------------------------------------------------------------------------
	it('Free mint should fail if wrong FreeMint NFT', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// setup
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// freeMintOut => replaced freeMintNFT with dummyTokenId
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: dummyTokenId, amount: 1n }]) // WRONG
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	// ------------------------------------------------------------------------
	// 11) property("Free mint should fail for negative dexy minted")
	// ------------------------------------------------------------------------
	it('Free mint should fail for negative dexy minted', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;

		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;

		// negative minted => -35000n
		const dexyMinted = -35000n; // triggers failure

		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		// The Scala code tries bankReservesYOut = bankReservesYIn - dexyMinted => that becomes a +
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const resetHeightIn = BigInt(mockChain.height);
		const resetHeightOut = resetHeightIn;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		// parties
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		// The Scala code funds negative minted Dexy from a "funding box" with token dUSD = -dexyMinted => i.e. +35000
		// We'll replicate that:
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: BigInt(-dexyMinted) }] // 35000
		});
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		freeMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: freeMintNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// outputs
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const tx = new TransactionBuilder(mockChain.height)
			.from([...freeMintParty.utxos, ...bankParty.utxos, buybackBoxIn, ...fundingParty.utxos], {
				ensureInclusion: true
			})
			.withDataFrom([...oracleParty.utxos, ...lpParty.utxos])
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		// "Script reduced to false"
		expect(executed).toBe(false);
	});
});
