import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	OutputBuilder,
	TransactionBuilder,
	ErgoUnsignedInput,
	SLong,
	SInt,
	SBool
} from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';

import { vitestTokenIds, vitestErgoTrees } from '../../dexyConstants';

const {
	arbitrageMintNFT,
	bankNFT,
	buybackNFT,
	oraclePoolNFT,
	lpNFT,
	lpToken,
	dexyUSD,
	tracking101NFT
} = vitestTokenIds;

const { arbitrageMintErgoTree, bankErgoTree, buybackErgoTree, lpErgoTree, fakeScriptErgoTree } =
	vitestErgoTrees;

/**
 * Additional placeholders:
 */
const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

const fakeNanoErgs = 10_000_000_000_000n; // Large funding
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

const changeAddress = fakeScriptErgoTree;

describe('ArbMintSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		// Initialize a new mock blockchain at a high block height each test
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		// Reset chain state
		mockChain.reset();
	});

	// ------------------------------------------------------------------------
	// 1) property("Arbitrage mint should fail wrong tracking NFT")
	//    from ArbMintSpec.scala
	// ------------------------------------------------------------------------
	it.only('Arbitrage mint should fail wrong tracking NFT', () => {
		const oracleRateXy = 9000n;

		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom;

		const oracleRateXyWithFee = bankRate + buybackRate;

		const thresholdPercent = 101n;

		const lpBalance = 100_000_000n;
		const lpReservesX = 100_000_000_000_000n;
		const lpReservesY = 10_000_000_000n;

		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35_000n;

		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100_000_000_000_000n;
		const bankReservesYIn = 90_200_000_100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const t_arb = 30n;

		const remainingDexyIn = 10_000_000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
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

		trackingParty.addBalance(
			{
				nanoergs: lpReservesX,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }] // WRONG tracking NFT
			},
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex() // must be int in the mock sdk
			}
		);

		const resetHeightIn = BigInt(mockChain.height);
		arbMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }]
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

		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		const resetHeightOut = resetHeightIn;
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
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

		const mainInputs = [
			...arbMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos, ...trackingParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		// Execute => should fail with "Script reduced to false"
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Arbitrage mint should fail invalid tracking height', () => {
		const oracleRateXy = 9000n;

		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;

		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom;

		const oracleRateXyWithFee = bankRate + buybackRate;

		const thresholdPercent = 101n;

		const lpBalance = 100_000_000n;
		const lpReservesX = 100_000_000_000_000n;
		const lpReservesY = 10_000_000_000n;

		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35_000n;

		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;

		const bankReservesXIn = 100_000_000_000_000n;
		const bankReservesYIn = 90_200_000_100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;

		const t_arb = 30n;

		const remainingDexyIn = 10_000_000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		const trackingHeight = BigInt(mockChain.height) - t_arb; // differs from the -1 case

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
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

		trackingParty.addBalance(
			{
				nanoergs: lpReservesX,
				tokens: [{ tokenId: tracking101NFT, amount: 1n }]
			},
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);

		const resetHeightIn = BigInt(mockChain.height);
		arbMintParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }]
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

		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({
			0: SInt(1).toHex()
		});

		const resetHeightOut = resetHeightIn;
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
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

		const mainInputs = [
			...arbMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos, ...trackingParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
