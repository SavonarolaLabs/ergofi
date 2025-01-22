import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SLong, SInt, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { vitestErgoTrees, vitestTokenIds } from '../../dexyConstants';

const { lpRedeemNFT, oraclePoolNFT, lpNFT, lpToken, dexyUSD } = vitestTokenIds;
const { lpErgoTree, lpRedeemErgoTree, fakeScriptErgoTree } = vitestErgoTrees;

const fakeNanoErgs = 10000000000000n;
const dummyNanoErgs = 100000n;
const minStorageRent = 1000000n;
const fee = 1000000n;

describe('LpRedeemSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Redeem Lp (deposit Lp and withdraw Ergs + Dexy) should work', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n;
		const withdrawY = 49n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Redeem Lp should fail if Lp address changed', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n;
		const withdrawY = 49n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, fakeScriptErgoTree).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if less LP deposited', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n - 1n;
		const withdrawX = (500000n / 100n) * 98n;
		const withdrawY = 49n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if more Ergs taken', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n + 1n;
		const withdrawY = 49n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if more Dexy taken', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n;
		const withdrawY = 49n + 1n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if more Dexy and 0 Ergs taken', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = 0n;
		const withdrawY = 50n + 1n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if 0 Dexy and more Ergs taken', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n + 1n;
		const withdrawY = 0n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it('Redeem Lp should not work if oracle rate is below threshold', () => {
		const oracleRateXy = 10206n * 1000000n;
		const lpBalanceIn = 100000000n;
		const reservesXIn = 1000000000000n;
		const reservesYIn = 100000000n;
		const lpRateXY = reservesXIn / reservesYIn;
		const lpRedeemed = 49950n;
		const withdrawX = (500000n / 100n) * 98n;
		const withdrawY = 49n;
		const reservesXOut = reservesXIn - withdrawX;
		const reservesYOut = reservesYIn - withdrawY;
		const lpBalanceOut = lpBalanceIn + lpRedeemed;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
		const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
		const redeemParty = mockChain.addParty(lpRedeemErgoTree, 'Redeem');

		fundingParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [{ tokenId: lpToken, amount: lpRedeemed }]
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
			nanoergs: reservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: reservesYIn }
			]
		});

		redeemParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: lpRedeemNFT, amount: 1n }]
		});

		const lpOut = new OutputBuilder(reservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: reservesYOut }
		]);

		const redeemOut = new OutputBuilder(minStorageRent, redeemParty.address).addTokens([
			{ tokenId: lpRedeemNFT, amount: 1n }
		]);

		const mainInputs = [...lpParty.utxos, ...redeemParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(redeemOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
