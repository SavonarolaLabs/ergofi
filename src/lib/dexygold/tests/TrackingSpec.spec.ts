import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	OutputBuilder,
	TransactionBuilder,
	ErgoUnsignedInput,
	SInt,
	SLong,
	SBool
} from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { contractConfig, vitestErgoTrees, vitestTokenIds } from '../dexyConstants';

describe('TrackingSpec', () => {
	let mockChain: MockChain;

	const { fakeScriptErgoTree, lpErgoTree, trackingErgoTree } = vitestErgoTrees;
	const { oraclePoolNFT, lpNFT, lpToken, dexyUSD, tracking98NFT, tracking101NFT } = vitestTokenIds;
	const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

	const fakeNanoErgs = 10_000_000_000_000n;
	const minStorageRent = 1_000_000n;
	const fee = 1_000_000n;

	const trackingAddress = trackingErgoTree;
	const changeAddress = fakeScriptErgoTree;

	const { intMax } = contractConfig;
	const intMaxHex = SInt(Number(contractConfig.intMax)).toHex();

	beforeEach(() => {
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it.only('Trigger 98% tracker should work', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
	it.only('Trigger 101% tracker should work', () => {
		// Tracking101 => lpRate > 101 * Oracle
		// Tracking101  R6: false
		const lpInCirc = 10_000n;
		const oracleRateXY = 9_088n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 101n; // R4: 101
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x > y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking101NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(false).toHex(), //true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking101NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(false).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
	it.only('Trigger 98% tracker should fail if lp price is not below', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_000n * 1_000_000n; // <==
		//const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x >= y).toBe(true); //<==
		//expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false); //<==
		//expect(executed).toBe(true);
	});
	it.only('Trigger 98% tracker should fail if tracking address changed', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, changeAddress) //<==
			//const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
	it.only('Trigger 98% tracker should fail if wrong oracle NFT', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }] //<==
				//tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
	it.only('Trigger 98% tracker should fail if wrong lp NFT', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: dummyTokenId, amount: 1n }, //<==
					//{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
	it.only('Trigger 98% tracker should fail if already triggered', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = 1234n; //<==
		//const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				//R7: intMaxHex
				R7: SInt(Number(trackingHeightIn)).toHex() //<==
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
	it.only('Trigger 98% tracker should work', () => {
		// Tracking98 => lpRate < 98 * Oracle
		// Tracking98  R6: true
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_205n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 98n; // R4: 98
		const denomIn = 100n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x < y).toBe(true); //Tracking R6: true => '<'| false => '>'
		const trackingHeightOut = BigInt(mockChain.height);
		const trackingHeightIn = BigInt(Number.MAX_SAFE_INTEGER);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(), //Tracking R6: true = less | false = more
				R7: intMaxHex
				//R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
	it.only('Reset 98% tracker should fail if condition not satisfied', () => {
		const lpInCirc = 10_000n;
		const oracleRateXY = 10_210n * 1_000_000n; //<==
		//const oracleRateXY = 10_000n * 1_000_000n;
		const lpBalance = 10_000_000n;
		const reservesX = 10_000_000_000n;
		const reservesY = 1_000_000n;
		const numIn = 49n;
		const denomIn = 50n;
		const trackingHeightOut = BigInt(Number.MAX_SAFE_INTEGER);
		const trackingHeightIn = 1234n;
		const lpRateXY = reservesX / reservesY;
		const x = lpRateXY * denomIn;
		const y = (numIn * oracleRateXY) / 1_000_000n;
		expect(x >= y).toBe(false); //<==
		//expect(x >= y).toBe(true);

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs
		});

		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXY).toHex()
			}
		);

		const lpParty = mockChain.addParty(lpErgoTree, 'Lp');
		lpParty.addBalance(
			{
				nanoergs: reservesX,
				tokens: [
					{ tokenId: lpNFT, amount: 1n },
					{ tokenId: lpToken, amount: lpBalance },
					{ tokenId: dexyUSD, amount: reservesY }
				]
			},
			{
				R4: SLong(lpInCirc).toHex()
			}
		);

		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);

		const trackingOut = new OutputBuilder(minStorageRent, trackingAddress)
			.addTokens([{ tokenId: tracking98NFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(numIn)).toHex(),
				R5: SInt(Number(denomIn)).toHex(),
				R6: SBool(true).toHex(),
				R7: intMaxHex //<==
				// R7: SInt(Number(trackingHeightOut)).toHex()
			});

		const mainInputs = [...trackingParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...lpParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs)
			.withDataFrom(dataInputs)
			.to(trackingOut)
			.payFee(fee)
			.sendChangeTo(changeAddress)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
