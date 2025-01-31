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
import { bankMint } from '$lib/dexygold/dexyGold';

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

const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

const fakeNanoErgs = 10_000_000_000_000n; // Large funding
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;
const trackingValidHeightR7 = 999969; // 1_000_000 - t_arb - 1n

const changeAddress = fakeScriptErgoTree;

describe('ArbMintSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});
	// (f0 NOT RESET)
	it.only('Arbitrage mint (remove Dexy from and adding Ergs to bank box) should work', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;

		const {
			contractErg,
			bankErgsAdded: compare1,
			buybackErgsAdded: compare2
		} = bankMint(oracleRateXy, 1_000_000n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted);

		console.log(
			'valid calculations:',
			bankErgsAdded == compare1,
			' ',
			buybackErgsAdded == compare2,
			' ',
			bankErgsAdded + buybackErgsAdded == contractErg
		);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: 100000000000000n,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: 10000000000n }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: 100000000000000n, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(trackingValidHeightR7).toHex() //<-- Fixed
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const resetHeightIn = 1000000n + 1n; // <-- Fixed
		const resetHeightOut = resetHeightIn;
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const fundingBoxIn = new ErgoUnsignedInput(fundingParty.utxos.at(0));
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingBoxIn
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
		const tx = new TransactionBuilder(1000000)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
	// (f0 NOT RESET)
	it.only('Arbitrage mint should fail if threshold is invalid', () => {
		const oracleRateXy = 10000n * 1000000n; //<==
		//const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n <= thresholdPercent * oracleRateXyWithFee).toBe(true); //<==
		//expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: 100000000000000n,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: 10000000000n }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: 100000000000000n, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(trackingValidHeightR7).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const resetHeightIn = 1000000n + 1n;
		const resetHeightOut = resetHeightIn;
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const fundingBoxIn = new ErgoUnsignedInput(fundingParty.utxos.at(0));
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingBoxIn
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
		const tx = new TransactionBuilder(1000000)
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
	// (f0 NOT RESET - broken)
	it.skip('Arbitrage mint should fail if negative amount minted', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const dexyMinted = -35000n; //<==
		//const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: 100000000000000n,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: 10000000000n }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: 100000000000000n, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(trackingValidHeightR7).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const resetHeightIn = 1000000n + 1n;
		const resetHeightOut = resetHeightIn;
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const fundingBoxIn = new ErgoUnsignedInput(fundingParty.utxos.at(0));
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingBoxIn
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
		const tx = new TransactionBuilder(1000000)
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
	// (f0 NOT RESET)
	it.only('Arbitrage mint should fail if counter not reset and more Dexy taken than allowed', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const remainingDexyIn = 10000000n; //<==
		//const dexyMinted = 35000n;
		const dexyMinted = remainingDexyIn + 1n; //<==
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		//const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: 100000000000000n,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: 10000000000n }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: 100000000000000n, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(trackingValidHeightR7).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		const resetHeightIn = 1000000n + 1n;
		const resetHeightOut = resetHeightIn;
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const fundingBoxIn = new ErgoUnsignedInput(fundingParty.utxos.at(0));
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingBoxIn
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
		const tx = new TransactionBuilder(1000000)
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

	// (f0 RESET)
	it.only('Arbitrage mint should work if counter (R4) is reset and max allowed (R5) also reset', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
		expect(executed).toBe(true);
	});
	// (f1 RESET)
	it.only('Arbitrage mint should fail if counter (R4) is reset but max allowed (R5) not reset', () => {
		const oracleRateXy = 9000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted; //<==
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: 10000000000n }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f2 RESET)
	it.only('Arbitrage mint should fail if counter (R4) is reset and max allowed (R5) reset but more Dexy taken than permitted', () => {
		const oracleRateXy = 9000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * lpReservesY) / oracleRateXyWithFee;
		const dexyMinted = maxAllowedIfReset + 1n; //<==
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f3 RESET) ?????????????
	it.skip('Arbitrage mint should fail if counter is not reset when too many blocks passed', () => {
		const oracleRateXy = 9000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);
		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = remainingDexyIn - dexyMinted; //<== ???? ???? not T
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = resetHeightIn;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{
				R4: SInt(Number(resetHeightIn)).toHex(),
				R5: SLong(remainingDexyIn).toHex()
			}
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f4 RESET NEW)
	it.only('Arbitrage mint should fail if register R4 (reset height) of ArbitrageMint box has incorrect value', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = resetHeightIn + 1n; //<==
		//const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f5 RESET NEW)
	it.only('Arbitrage mint should fail if register R5 (remaining Dexy) of ArbitrageMint box has incorrect value', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted - 1n; //<==
		//const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f6 RESET NEW)
	it.only('Arbitrage mint should fail if Bank Dexy token id changed', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) }] //<==
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) } //<==
			//{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);
		const mainInputs = [
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f7 RESET NEW)
	it.only('Arbitrage mint should fail if wrong ArbitrageMint box NFT', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: dummyTokenId, amount: 1n }] }, //<==
			//{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: dummyTokenId, amount: 1n }]) //<==
			//.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f8 RESET NEW)
	it.only('Arbitrage mint should fail if wrong Bank box NFT', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, //<==
				//{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: dummyTokenId, amount: 1n }, //<==
			//{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);
		const mainInputs = [
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f9 RESET NEW)
	it.only('Arbitrage mint should fail if ArbitrageMint box NFT changed', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }] //<==
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: dummyTokenId, amount: 1n }]) //<==
			//.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f10 RESET NEW)
	it.only('Arbitrage mint should fail if Bank box NFT changed', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }] //<==
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, arbMintParty.address)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: dummyTokenId, amount: 1n }, //<==
			//{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);
		const mainInputs = [
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f11 RESET NEW)
	it.only('Arbitrage mint should fail if Arbitrage box script changed', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
		const arbMintOut = new OutputBuilder(minStorageRent, changeAddress)
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f12 RESET NEW)
	it.only('Arbitrage mint should fail wrong Oracle NFT', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: dummyTokenId, amount: 1n }] }, //<==
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f13 RESET NEW)
	it.only('Arbitrage mint should fail wrong LP NFT', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n }, //<==
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
	// (f14 RESET NEW)
	it.only('Arbitrage mint should fail wrong tracking NFT', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;
		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: dummyTokenId, amount: 1n }] }, //<==
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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

	// (f15 RESET NEW)
	it.only('Arbitrage mint should fail invalid tracking height', () => {
		const oracleRateXy = 9000n * 1_000_000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1_000_000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1_000_000n;
		const oracleRateXyWithFee = bankRate + buybackRate;
		const thresholdPercent = 101n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		const lpRateXy = lpReservesX / lpReservesY;
		expect(lpRateXy).toBe(10000n);
		expect(lpRateXy * 100n > thresholdPercent * oracleRateXyWithFee).toBe(true);

		const dexyMinted = 35000n;
		const bankErgsAdded = bankRate * dexyMinted;
		const buybackErgsAdded = buybackRate * dexyMinted;
		const bankReservesXIn = 100000000000000n;
		const bankReservesYIn = 90200000100n;
		const bankReservesYOut = bankReservesYIn - dexyMinted;
		const bankReservesXOut = bankReservesXIn + bankErgsAdded;
		const t_arb = 30n;
		const maxAllowedIfReset =
			(lpReservesX - oracleRateXyWithFee * BigInt(lpReservesY)) / oracleRateXyWithFee;
		expect(maxAllowedIfReset).toBe(1055831951n);
		const remainingDexyIn = 10000000n;
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		const trackingHeight = BigInt(mockChain.height) - t_arb + 1n; //<==
		//const trackingHeight = BigInt(mockChain.height) - t_arb - 1n;

		const resetHeightIn = BigInt(mockChain.height) - 1n;
		const resetHeightOut = BigInt(mockChain.height) + t_arb + 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesX,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: lpReservesY }
			]
		});
		const trackingParty = mockChain.addParty(lpErgoTree, 'Tracking');
		trackingParty.addBalance(
			{ nanoergs: lpReservesX, tokens: [{ tokenId: tracking101NFT, amount: 1n }] },
			{
				R4: SInt(100).toHex(),
				R5: SInt(101).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		const arbMintParty = mockChain.addParty(arbitrageMintErgoTree, 'ArbMint');
		arbMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: arbitrageMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		const buybackBoxIn = new ErgoUnsignedInput(buybackParty.utxos.at(0));
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });
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
			arbMintParty.utxos.at(0),
			bankParty.utxos.at(0),
			buybackBoxIn,
			fundingParty.utxos.at(0)
		];
		const dataInputs = [oracleParty.utxos.at(0), lpParty.utxos.at(0), trackingParty.utxos.at(0)];
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
