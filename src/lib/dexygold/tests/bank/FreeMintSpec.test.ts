// File: FreeMintSpec.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputBuilder, TransactionBuilder, ErgoUnsignedInput, SInt, SLong } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';

// --------------------------------------------------------------------
// Example placeholders for IDs, ergoTrees, etc. Replace with real data.
// --------------------------------------------------------------------
import { vitestTokenIds, vitestErgoTrees } from '../../dexyConstants';
import { bankMint, bankMintInpuErg } from '$lib/dexygold/dexyGold';

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

	it.only('			: Mint ERG : Input Dexy', () => {
		let oracleRateXy = 10000n * 1000000n; // 10^10
		let bankFeeNum = 3n; // => 0.5% fee part
		let buybackFeeNum = 2n; // => 0.5% fee part
		let feeDenom = 1000n;

		let bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n; // => 10030
		let buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n; // => 20

		let lpBalance = 100000000n;
		let lpReservesX = 100000000000000n;
		let lpReservesY = 10000000000n;

		let dexyMinted = 35000n; // positive


		// Registers in freeMintBox
		let resetHeightIn = BigInt(mockChain.height + 1);
		let resetHeightOut = resetHeightIn; // not reset
		let remainingDexyIn = 10000000n;
		let remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties for each box
		let fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		let buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		let oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		let lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		let freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		let bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		let { contractErg, bankErgsAdded, buybackErgsAdded } = bankMint(
			oracleRateXy,
			1_000_000n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyMinted
		);
		expect(contractErg).toBe(351750000n);
	
		//let bankErgsAdded = bankRate * dexyMinted; // 10030 * 35000
		//let buybackErgsAdded = buybackRate * dexyMinted; // 20 * 35000

		let bankReservesXIn = 100000000000000n;
		let bankReservesYIn = 90200000100n;
		let bankReservesYOut = bankReservesYIn - dexyMinted;
		let bankReservesXOut = bankReservesXIn + bankErgsAdded;

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
		
	it.only('			: Mint Dexy : Input ERG', () => {
		let oracleRateXy = 10000n * 1000000n; // 10^10
		let bankFeeNum = 3n; // => 0.5% fee part
		let buybackFeeNum = 2n; // => 0.5% fee part
		let feeDenom = 1000n;

		let bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n; // => 10030
		let buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n; // => 20

		let lpBalance = 100000000n;
		let lpReservesX = 100000000000000n;
		let lpReservesY = 10000000000n;

		let dexyMinted = 35000n; // positive

		let ergInput = 351750000n;


		// Registers in freeMintBox
		let resetHeightIn = BigInt(mockChain.height + 1);
		let resetHeightOut = resetHeightIn; // not reset
		let remainingDexyIn = 10000000n;
		let remainingDexyOut = remainingDexyIn - dexyMinted;

		// Parties for each box
		let fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		let buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		let oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		let lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		let freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		let bankParty = mockChain.addParty(bankErgoTree, 'Bank');

		let { contractDexy, bankErgsAdded, buybackErgsAdded } = bankMintInpuErg(
			oracleRateXy,
			1_000_000n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			ergInput
		);
	
		//let bankErgsAdded = bankRate * dexyMinted; // 10030 * 35000
		//let buybackErgsAdded = buybackRate * dexyMinted; // 20 * 35000

		let bankReservesXIn = 100000000000000n;
		let bankReservesYIn = 90200000100n;
		let bankReservesYOut = bankReservesYIn - dexyMinted;
		let bankReservesXOut = bankReservesXIn + bankErgsAdded;

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
})