import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { SLong, SInt, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { vitestErgoTrees, vitestTokenIds } from '../../dexyConstants';

const {
	extractionNFT,
	bankNFT,
	dexyUSD,
	lpNFT,
	lpToken,
	tracking95NFT,
	oraclePoolNFT,
	updateNFT,
	ballotTokenId
} = vitestTokenIds;
const {
	extractScriptErgoTree,
	lpErgoTree,
	fakeScriptErgoTree,
	extractUpdateErgoTree,
	ballotErgoTree,
	bankErgoTree
} = vitestErgoTrees;

const bankAddress = bankErgoTree;

const fakeNanoErgs = 10000000000000n;
const minStorageRent = 1000000n;
const fee = 1000000n;
const height = 1000000;
describe('ExtractSpec', () => {
	let mockChain: MockChain;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1000000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it.only('Extract to future (extract Dexy from Lp and store in extract box) should work', () => {
		const oracleRateXy = 10000n * 1000000n;
		const lpBalanceIn = 100000000n;
		const lpReservesXIn = 100000000000000n;
		const lpReservesYIn = 10550000000n;
		const deltaDexy = 250000000n;
		const lpReservesXOut = lpReservesXIn;
		const lpReservesYOut = lpReservesYIn - deltaDexy;
		const lpBalanceOut = lpBalanceIn;
		const extractBoxDexyIn = 100n;
		const extractBoxDexyOut = extractBoxDexyIn + deltaDexy;
		//const bankReservesX = 10000n * 1000000000n - 1n; // 10_000 erg
		const bankReservesX = 10n * 1000000000n - 1n; // 10_erg
		const bankReservesY = 100n;
		const T_delay = 360;
		const T_extract = 720;
		const trackingHeight = BigInt(mockChain.height) - BigInt(T_extract) - 1n;
		const extractBoxCreationHeightIn = BigInt(mockChain.height) - BigInt(T_delay) - 1n;

		const fundingParty = mockChain.addParty(fakeScriptErgoTree);
		const oracleParty = mockChain.addParty(fakeScriptErgoTree);
		const bankParty = mockChain.addParty(fakeScriptErgoTree);
		const tracking95Party = mockChain.addParty(fakeScriptErgoTree);
		const lpParty = mockChain.addParty(lpErgoTree);
		//JUMP BACK
		mockChain.jumpTo(Number(extractBoxCreationHeightIn));
		const extractParty = mockChain.addParty(extractScriptErgoTree);
		extractParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [
					{ tokenId: extractionNFT, amount: 1n },
					{ tokenId: dexyUSD, amount: extractBoxDexyIn }
				]
			},
			{ R4: SInt(Number(extractBoxCreationHeightIn)).toHex() }
		);
		mockChain.jumpTo(height);
		//JUMP FORWARD
		fundingParty.addBalance({ nanoergs: fakeNanoErgs });
		oracleParty.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: oraclePoolNFT, amount: 1n }] },
			{ R4: SLong(oracleRateXy).toHex() }
		);
		bankParty.addBalance({
			nanoergs: bankReservesX,
			tokens: [
				{ tokenId: bankNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: bankReservesY }
			]
		});
		tracking95Party.addBalance(
			{ nanoergs: minStorageRent, tokens: [{ tokenId: tracking95NFT, amount: 1n }] },
			{
				R4: SInt(19).toHex(),
				R5: SInt(20).toHex(),
				R6: SInt(1).toHex(),
				R7: SInt(Number(trackingHeight)).toHex()
			}
		);
		lpParty.addBalance({
			nanoergs: lpReservesXIn,
			tokens: [
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpToken, amount: lpBalanceIn },
				{ tokenId: dexyUSD, amount: lpReservesYIn }
			]
		});

		const lpOut = new OutputBuilder(lpReservesXOut, lpParty.address).addTokens([
			{ tokenId: lpNFT, amount: 1n },
			{ tokenId: lpToken, amount: lpBalanceOut },
			{ tokenId: dexyUSD, amount: lpReservesYOut }
		]);

		const extractOut = new OutputBuilder(minStorageRent, extractParty.address).addTokens([
			{ tokenId: extractionNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: extractBoxDexyOut }
		]);

		const mainInputs = [...lpParty.utxos, ...extractParty.utxos, ...fundingParty.utxos];
		//const mainInputs = [...lpParty.utxos, ...extractParty.utxos, ...fundingParty.utxos];
		const dataInputs = [...oracleParty.utxos, ...tracking95Party.utxos, ...bankParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(lpOut)
			.to(extractOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Successful update when enough votes collected', () => {
		const fee2 = 1500000n;
		const fundingParty = mockChain.addParty(fakeScriptErgoTree);
		const updateParty = mockChain.addParty(extractUpdateErgoTree);
		const extractParty = mockChain.addParty(extractScriptErgoTree);
		const ballotParty0 = mockChain.addParty(ballotErgoTree);
		const ballotParty1 = mockChain.addParty(ballotErgoTree);
		const ballotParty2 = mockChain.addParty(ballotErgoTree);

		fundingParty.addBalance({ nanoergs: fakeNanoErgs });

		updateParty.addBalance({
			nanoergs: minStorageRent,
			tokens: [{ tokenId: updateNFT, amount: 1n }]
		});

		ballotParty0.addBalance(
			{
				nanoergs: 200000000n,
				tokens: [{ tokenId: ballotTokenId, amount: 1n }]
			},
			{
				R4: SLong(1234n).toHex() // placeholder
			}
		);
		ballotParty1.addBalance(
			{
				nanoergs: 200000000n,
				tokens: [{ tokenId: ballotTokenId, amount: 1n }]
			},
			{
				R4: SLong(5678n).toHex() // placeholder
			}
		);
		ballotParty2.addBalance(
			{
				nanoergs: 200000000n,
				tokens: [{ tokenId: ballotTokenId, amount: 1n }]
			},
			{
				R4: SLong(9012n).toHex() // placeholder
			}
		);

		extractParty.addBalance({
			nanoergs: fakeNanoErgs,
			tokens: [
				{ tokenId: extractionNFT, amount: 1n },
				{ tokenId: dexyUSD, amount: 1n }
			]
		});

		const updateOut = new OutputBuilder(minStorageRent, updateParty.address).addTokens([
			{ tokenId: updateNFT, amount: 1n }
		]);

		const extractOut = new OutputBuilder(fakeNanoErgs, bankAddress).addTokens([
			{ tokenId: extractionNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: 1n }
		]);

		const ballot0Out = new OutputBuilder(200000000n, ballotParty0.address);
		const ballot1Out = new OutputBuilder(200000000n, ballotParty1.address);
		const ballot2Out = new OutputBuilder(200000000n, ballotParty2.address);

		const mainInputs = [
			...updateParty.utxos,
			...extractParty.utxos,
			...ballotParty0.utxos,
			...ballotParty1.utxos,
			...ballotParty2.utxos,
			...fundingParty.utxos
		];
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.to(updateOut)
			.to(extractOut)
			.to(ballot0Out)
			.to(ballot1Out)
			.to(ballot2Out)
			.payFee(fee2)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});
});
