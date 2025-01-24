import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { blake2b } from '@noble/hashes/blake2b';
import { OutputBuilder, TransactionBuilder, SInt, SLong, SBool, SColl } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { vitestTokenIds, vitestErgoTrees, vitestAddresses } from '../../dexyConstants';

const {
	oraclePoolNFT,
	tracking98NFT,
	lpNFT,
	lpToken,
	dexyUSD,
	bankNFT,
	interventionNFT,
	updateNFT,
	ballotTokenId
} = vitestTokenIds;

const {
	fakeScriptErgoTree,
	lpErgoTree,
	bankErgoTree,
	interventionErgoTree,
	interventionUpdateErgoTree,
	trackingErgoTree,
	ballotErgoTree
} = vitestErgoTrees;
const { interventionUpdateAddress } = vitestAddresses;

const dummyTokenId = 'a1e5ce5aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

const fakeNanoErgs = 10000000000000n;
const dummyNanoErgs = 100000n;
const minStorageRent = 1000000n;
const fee = 1000000n;
const changeAddress = fakeScriptErgoTree;
const height = 1000000;

describe('InterventionSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it.only('transfer Ergs from Bank to Lp and Dexy from Lp to Bank should work', () => {
		// Main Error   val lastIntervention = SELF.creationInfo._1
		const T_int = 360n; //
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_track = 20n;
		const trackingHeightIn = BigInt(mockChain.height) - T_track - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T_int - 1n;

		//JUMP BACK
		mockChain.jumpTo(Number(lastInterventionHeight));
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		mockChain.jumpTo(height);
		//JUMP FORWARD

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});

		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('fails if not enough Dexy tokens taken from the LP', () => {
		const thresholdPercent = 98n;
		const lpBalanceIn = 100000000n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const preWithdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const withdrawY = (preWithdrawY * 98n) / 100n;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('fails if too many Dexy tokens taken from the LP', () => {
		const thresholdPercent = 98n;
		const lpBalanceIn = 100000000n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const preWithdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const withdrawY = (preWithdrawY * 1001n) / 1000n;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceIn },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('fails if LP tokens reduced', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn - 1n;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('fails if LP tokens increased', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn + 1n;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('fails if bank script changed', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, fakeScriptErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('fails if Lp script changed', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, fakeScriptErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if Intervention script changed', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, fakeScriptErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if tracking height is less', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if last intervention height is less', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if tracker NFT is different', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if oracle NFT is different', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: dummyTokenId, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...trackingParty.utxos, ...oracleParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if tracker is not triggered', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T = 360n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(2147483647).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should work if more tokens deposited to bank than taken from Lp', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: dexyUSD, amount: 1n }]
		});
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{
				tokenId: dexyUSD,
				amount: bankReservesYOut + 1n
			}
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('should work if more Ergs deposited to Lp than taken from Bank', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut + 1n, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('should not work if less Ergs deposited to Lp than taken from Bank', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut - 1n, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should not work if less Tokens deposited to Bank than taken from Lp', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * lpReservesYIn) / lpReservesXIn;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut - 1n }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if ergs reduced in Lp box', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = -1n;
		const withdrawY = (depositX * BigInt(lpReservesYIn)) / BigInt(lpReservesXIn);
		const lpReservesXOut = BigInt(lpReservesXIn) + depositX;
		const lpReservesYOut = BigInt(lpReservesYIn) - withdrawY;
		const bankReservesXOut = BigInt(bankReservesXIn) - depositX;
		const bankReservesYOut = BigInt(bankReservesYIn) + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if nothing changed in Lp box', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 0n;
		const withdrawY = 0n;
		const lpReservesXOut = lpReservesXIn + depositX;
		const lpReservesYOut = lpReservesYIn - withdrawY;
		const bankReservesXOut = bankReservesXIn - depositX;
		const bankReservesYOut = bankReservesYIn + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if more ergs deposited to Lp box', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent + 1n) * 1000000n;
		const depositX = 6000000000000n;
		const withdrawY = (depositX * BigInt(lpReservesYIn)) / BigInt(lpReservesXIn);
		const lpReservesXOut = BigInt(lpReservesXIn) + depositX;
		const lpReservesYOut = BigInt(lpReservesYIn) - withdrawY;
		const bankReservesXOut = BigInt(bankReservesXIn) - depositX;
		const bankReservesYOut = BigInt(bankReservesYIn) + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const a = lpReservesXOut * 1000n;
		const b = (oracleRateXy / 1000000n) * lpReservesYOut * 995n;
		expect(a > b).toBe(true);
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should fail if oracle rate is lower than needed', () => {
		const lpBalanceIn = 100000000n;
		const thresholdPercent = 98n;
		const bankReservesXIn = 1000000000000000n;
		const bankReservesYIn = 10000000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10000000000n;
		const lpRateXyIn = lpReservesXIn / lpReservesYIn;
		const oracleRateXy = ((lpRateXyIn * 100n) / thresholdPercent) * 1000000n;
		const depositX = 50000000000n;
		const withdrawY = (depositX * BigInt(lpReservesYIn)) / BigInt(lpReservesXIn);
		const lpReservesXOut = BigInt(lpReservesXIn) + depositX;
		const lpReservesYOut = BigInt(lpReservesYIn) - withdrawY;
		const bankReservesXOut = BigInt(bankReservesXIn) - depositX;
		const bankReservesYOut = BigInt(bankReservesYIn) + withdrawY;
		const lpBalanceOut = lpBalanceIn;
		const T_int = 20n;
		const T = 360n;
		const trackingHeightIn = BigInt(mockChain.height) - T_int - 1n;
		const lastInterventionHeight = BigInt(mockChain.height) - T - 1n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		oracleParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: oraclePoolNFT, amount: 1n }]
			},
			{
				R4: SLong(oracleRateXy).toHex()
			}
		);
		const trackingParty = mockChain.addParty(trackingErgoTree, 'Tracking98');
		trackingParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: tracking98NFT, amount: 1n }]
			},
			{
				R4: SInt(49).toHex(),
				R5: SInt(50).toHex(),
				R6: SBool(true).toHex(),
				R7: SInt(Number(trackingHeightIn)).toHex()
			}
		);
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		bankParty.addBalance({
			nanoergs: bankReservesXIn,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesYIn }
			]
		});
		const interventionParty = mockChain.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: interventionNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(lastInterventionHeight)).toHex()
			}
		);
		const lpOut = new OutputBuilder(lpReservesXOut, lpErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);
		const bankOut = new OutputBuilder(bankReservesXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);
		const interventionOut = new OutputBuilder(minStorageRent, interventionErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n }
		]);
		const mainInputs = [
			...lpParty.utxos,
			...bankParty.utxos,
			...interventionParty.utxos,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos, ...trackingParty.utxos];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(bankOut)
			.to(interventionOut)
			.payFee(fee)
			.sendChangeTo(fakeScriptErgoTree)
			.build();
		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('should succeed update when enough votes collected', () => {
		const fee = 1500000n;
		const updateNFTlocal = updateNFT;
		const ballotTokenIdLocal = ballotTokenId;
		const interventionUpdateAddressLocal = interventionUpdateAddress;
		const bankErgoTreeBytes = Buffer.from(bankErgoTree.slice(2), 'hex');
		const mockChainLocal = mockChain;
		const fundingParty = mockChainLocal.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const updateBoxParty = mockChainLocal.addParty(interventionUpdateErgoTree, 'UpdateBox');
		updateBoxParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: updateNFTlocal, amount: 1n }]
		});
		const ballotParty0 = mockChainLocal.addParty(ballotErgoTree, 'Ballot0');
		const ballotParty1 = mockChainLocal.addParty(ballotErgoTree, 'Ballot1');
		const ballotParty2 = mockChainLocal.addParty(ballotErgoTree, 'Ballot2');
		ballotParty0.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		ballotParty1.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		ballotParty2.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		const interventionParty = mockChainLocal.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [
				{ tokenId: interventionNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 1n }
			]
		});

		const newHash = blake2b(bankErgoTreeBytes, { dkLen: 32 });
		const ballotParty0Utxo = ballotParty0.utxos.at(0);
		const ballotParty1Utxo = ballotParty1.utxos.at(0);
		const ballotParty2Utxo = ballotParty2.utxos.at(0);
		const produceBallot = (partyUtxo: any, pk: string) => {
			const withRegs = new OutputBuilder(partyUtxo.value, ballotErgoTree)
				.addTokens([{ tokenId: ballotTokenIdLocal, amount: 1n }])
				.setAdditionalRegisters({
					R4: SColl(SLong, [0n]).toHex(),
					R5: SColl(
						SLong,
						Array.from(Buffer.from(updateBoxParty.utxos.at(0).boxId, 'hex'))
					).toHex(),
					R6: SColl(SLong, Array.from(newHash)).toHex()
				});
			const tx = new TransactionBuilder(mockChainLocal.height)
				.from([partyUtxo, ...fundingParty.utxos])
				.to(withRegs)
				.payFee(fee)
				.sendChangeTo(fundingParty.address)
				.build();
			mockChainLocal.execute(tx);
			return mockChainLocal.utxos.find((x) => x.boxId === withRegs.boxId);
		};
		const ballot0 = produceBallot(
			ballotParty0Utxo,
			'37cc5cb5b54f98f92faef749a53b5ce4e9921890d9fb902b4456957d50791bd0'
		);
		const ballot1 = produceBallot(
			ballotParty1Utxo,
			'5878ae48fe2d26aa999ed44437cffd2d4ba1543788cff48d490419aef7fc149d'
		);
		const ballot2 = produceBallot(
			ballotParty2Utxo,
			'3ffaffa96b2fd6542914d3953d05256cd505d4beb6174a2601a4e014c3b5a78e'
		);
		const updateBoxUtxo = updateBoxParty.utxos.at(0);
		const interventionUtxo = interventionParty.utxos.at(0);
		const newUpdateOut = new OutputBuilder(minStorageRent, interventionUpdateErgoTree).addTokens([
			{ tokenId: updateNFTlocal, amount: 1n }
		]);
		const newInterventionOut = new OutputBuilder(fakeNanoErgs, bankErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: 1n }
		]);
		const revertBallot0 = new OutputBuilder(ballotParty0Utxo.value, ballotErgoTree).addTokens([
			{ tokenId: ballotTokenIdLocal, amount: 1n }
		]);
		const revertBallot1 = new OutputBuilder(ballotParty1Utxo.value, ballotErgoTree).addTokens([
			{ tokenId: ballotTokenIdLocal, amount: 1n }
		]);
		const revertBallot2 = new OutputBuilder(ballotParty2Utxo.value, ballotErgoTree).addTokens([
			{ tokenId: ballotTokenIdLocal, amount: 1n }
		]);
		const updateTx = new TransactionBuilder(mockChainLocal.height)
			.from([updateBoxUtxo, interventionUtxo, ballot0, ballot1, ballot2, ...fundingParty.utxos])
			.to(newUpdateOut)
			.to(newInterventionOut)
			.to(revertBallot0)
			.to(revertBallot1)
			.to(revertBallot2)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChainLocal.execute(updateTx, { throw: false });
		expect(executed).toBe(true);
	});

	it('should fail update when not enough votes collected', () => {
		const fee = 1500000n;
		const updateNFTlocal = updateNFT;
		const ballotTokenIdLocal = ballotTokenId;
		const interventionUpdateAddressLocal = interventionUpdateAddress;
		const bankErgoTreeBytes = Buffer.from(bankErgoTree.slice(2), 'hex');
		const mockChainLocal = mockChain;
		const fundingParty = mockChainLocal.addParty(fakeScriptErgoTree, 'Funding');
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		const updateBoxParty = mockChainLocal.addParty(interventionUpdateErgoTree, 'UpdateBox');
		updateBoxParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: updateNFTlocal, amount: 1n }]
		});
		const ballotParty0 = mockChainLocal.addParty(ballotErgoTree, 'Ballot0');
		const ballotParty1 = mockChainLocal.addParty(ballotErgoTree, 'Ballot1');
		const ballotParty2 = mockChainLocal.addParty(ballotErgoTree, 'Ballot2');
		ballotParty0.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		ballotParty1.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		ballotParty2.addBalance({
			nanoergs: 200000000n,
			tokens: [{ tokenId: ballotTokenIdLocal, amount: 1n }]
		});
		const interventionParty = mockChainLocal.addParty(interventionErgoTree, 'Intervention');
		interventionParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [
				{ tokenId: interventionNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 1n }
			]
		});
		const newHash = blake2b(bankErgoTreeBytes, { dkLen: 32 });
		const ballotParty0Utxo = ballotParty0.utxos.at(0);
		const ballotParty1Utxo = ballotParty1.utxos.at(0);
		const produceBallot = (partyUtxo: any, pk: string) => {
			const withRegs = new OutputBuilder(partyUtxo.value, ballotErgoTree)
				.addTokens([{ tokenId: ballotTokenIdLocal, amount: 1n }])
				.setAdditionalRegisters({
					R4: SColl(SLong, [0n]).toHex(),
					R5: SColl(
						SLong,
						Array.from(Buffer.from(updateBoxParty.utxos.at(0).boxId, 'hex'))
					).toHex(),
					R6: SColl(SLong, Array.from(newHash)).toHex()
				});
			const tx = new TransactionBuilder(mockChainLocal.height)
				.from([partyUtxo, ...fundingParty.utxos])
				.to(withRegs)
				.payFee(fee)
				.sendChangeTo(fundingParty.address)
				.build(pk ? [pk] : []);
			mockChainLocal.execute(tx);
			return mockChainLocal.utxos.find((x) => x.boxId === withRegs.boxId);
		};
		const ballot0 = produceBallot(
			ballotParty0Utxo,
			'37cc5cb5b54f98f92faef749a53b5ce4e9921890d9fb902b4456957d50791bd0'
		);
		const ballot1 = produceBallot(
			ballotParty1Utxo,
			'5878ae48fe2d26aa999ed44437cffd2d4ba1543788cff48d490419aef7fc149d'
		);
		const updateBoxUtxo = updateBoxParty.utxos.at(0);
		const interventionUtxo = interventionParty.utxos.at(0);
		const newUpdateOut = new OutputBuilder(minStorageRent, interventionUpdateErgoTree).addTokens([
			{ tokenId: updateNFTlocal, amount: 1n }
		]);
		const newInterventionOut = new OutputBuilder(fakeNanoErgs, bankErgoTree).addTokens([
			{ tokenId: interventionNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: 1n }
		]);
		const revertBallot0 = new OutputBuilder(ballotParty0Utxo.value, ballotErgoTree).addTokens([
			{ tokenId: ballotTokenIdLocal, amount: 1n }
		]);
		const revertBallot1 = new OutputBuilder(ballotParty1Utxo.value, ballotErgoTree).addTokens([
			{ tokenId: ballotTokenIdLocal, amount: 1n }
		]);
		const tx = new TransactionBuilder(mockChainLocal.height)
			.from([updateBoxUtxo, interventionUtxo, ballot0, ballot1, ...fundingParty.utxos])
			.to(newUpdateOut)
			.to(newInterventionOut)
			.to(revertBallot0)
			.to(revertBallot1)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();
		const executed = mockChainLocal.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
