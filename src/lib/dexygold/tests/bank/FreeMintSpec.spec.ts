import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutputBuilder, TransactionBuilder, ErgoUnsignedInput, SLong, SInt } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { vitestTokenIds, vitestErgoTrees } from '../../dexyConstants';

const { freeMintNFT, bankNFT, buybackNFT, oraclePoolNFT, lpNFT, lpToken, dexyUSD } = vitestTokenIds;

const { fakeScriptErgoTree, buybackErgoTree, bankErgoTree, freeMintErgoTree, lpErgoTree } =
	vitestErgoTrees;

const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';
const fakeNanoErgs = 10000000000000n;
const dummyNanoErgs = 100000n;
const minStorageRent = 1000000n;
const fee = 1000000n;
const changeAddress = fakeScriptErgoTree;

describe('FreeMintSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Free mint (remove Dexy from and adding Ergs to bank box) should work', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
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
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) }]
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
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
			{ tokenId: dummyTokenId, amount: BigInt(bankReservesYOut) }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const freeMintOut = new OutputBuilder(minStorageRent, changeAddress)
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const freeMintOut = new OutputBuilder(minStorageRent, changeAddress)
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
		const dummyOracleParty = mockChain.addParty(fakeScriptErgoTree, 'DummyOracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		buybackParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: buybackNFT, amount: 1n }]
		});
		dummyOracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: dummyTokenId, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		lpParty.addBalance({
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...dummyOracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: bankNFT, amount: 1n }]
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
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
		);
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: dummyTokenId, amount: 1n },
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
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
		const freeMintOut = new OutputBuilder(minStorageRent, freeMintParty.address)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(remainingDexyOut).toHex()
			});
		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: dummyTokenId, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const buybackOut = new OutputBuilder(
			fakeNanoErgs + buybackErgsAdded,
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		const wrongFreeMintBoxParty = mockChain.addParty(freeMintErgoTree, 'WrongFreeMintIn');
		wrongFreeMintBoxParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: dummyTokenId, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const mainInputs = [
			...wrongFreeMintBoxParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

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
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
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
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dummyTokenId, amount: 1n }]
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
			nanoergs: BigInt(100000000000000),
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalance },
				{ tokenId: dexyUSD, amount: BigInt(10000000000) }
			]
		});
		freeMintParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
			.addTokens([{ tokenId: dummyTokenId, amount: 1n }])
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
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Free mint should fail for negative dexy minted', () => {
		const oracleRateXy = 10000n * 1000000n;
		const bankFeeNum = 3n;
		const buybackFeeNum = 2n;
		const feeDenom = 1000n;
		const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / 1000000n;
		const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / 1000000n;
		const oracleRateWithFee = bankRate + buybackRate;
		const lpBalance = 100000000n;
		const lpReservesX = 100000000000000n;
		const lpReservesY = 10000000000n;
		expect(lpReservesX / lpReservesY).toBe(10000n);
		expect(bankRate).toBe(10030n);
		expect(buybackRate).toBe(20n);
		expect(oracleRateWithFee).toBe(10050n);
		const dexyMinted = -35000n;
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
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: BigInt(-dexyMinted) }]
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
			{ nanoergs: minStorageRent, tokens: [{ tokenId: freeMintNFT, amount: 1n }] },
			{ R4: SInt(Number(resetHeightIn)).toHex(), R5: SLong(remainingDexyIn).toHex() }
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
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
