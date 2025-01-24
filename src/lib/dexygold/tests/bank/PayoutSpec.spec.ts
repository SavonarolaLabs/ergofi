import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErgoUnsignedInput, OutputBuilder, SInt, SLong, TransactionBuilder } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';
import { vitestErgoTrees, vitestTokenIds } from '../../dexyConstants';

describe('PayoutSpec', () => {
	let mockChain: MockChain;

	const { payoutErgoTree, bankErgoTree, buybackErgoTree, fakeScriptErgoTree } = vitestErgoTrees;
	const { payoutNFT, bankNFT, buybackNFT, dexyUSD, oraclePoolNFT } = vitestTokenIds;

	const fee = 1_000_000n;
	const minStorageRent = 1_000_000n;
	const fakeNanoErgs = 10_000_000_000_000n;
	const initialDexyTokens = 100_000_000_000_000n;

	beforeEach(() => {
		mockChain = new MockChain({ height: 1_000_000 });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Payout should work', () => {
		const bankReservesXIn = 1_000_000_000_000n;
		const bankReservesYIn = initialDexyTokens - 100_000n;
		const bankReservesXOut = bankReservesXIn - bankReservesXIn / 200n;
		const bankReservesYOut = bankReservesYIn;
		const oracleRateXy = 10_000n * 1_000_000n;

		const payoutParty = mockChain.addParty(payoutErgoTree, 'Payout');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');

		payoutParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: payoutNFT, amount: 1n }]
			},
			{
				R4: SInt(0).toHex()
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

		const payoutOut = new OutputBuilder(minStorageRent, payoutParty.address)
			.addTokens([{ tokenId: payoutNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(BigInt(mockChain.height))).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + (bankReservesXIn - bankReservesXOut),
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const mainInputs = [
			...payoutParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(payoutOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Payout should be ok if less taken', () => {
		const bankReservesXIn = 1_000_000_000_000n;
		const bankReservesYIn = initialDexyTokens - 100_000n;
		const bankReservesXOut = bankReservesXIn - bankReservesXIn / 200n;
		const bankReservesYOut = bankReservesYIn;
		const oracleRateXy = 10_000n * 1_000_000n;

		const payoutParty = mockChain.addParty(payoutErgoTree, 'Payout');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');

		payoutParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: payoutNFT, amount: 1n }]
			},
			{
				R4: SInt(0).toHex()
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

		const payoutOut = new OutputBuilder(minStorageRent, payoutParty.address)
			.addTokens([{ tokenId: payoutNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(BigInt(mockChain.height))).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut + 1n, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + (bankReservesXIn - bankReservesXOut - 1n),
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const mainInputs = [
			...payoutParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(payoutOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(true);
	});

	it('Payout should fail if more ergs taken', () => {
		const bankReservesXIn = 1_000_000_000_000n;
		const bankReservesYIn = initialDexyTokens - 100_000n;
		const bankReservesXOut = bankReservesXIn - bankReservesXIn / 200n - 1n;
		const bankReservesYOut = bankReservesYIn;
		const oracleRateXy = 10_000n * 1_000_000n;

		const payoutParty = mockChain.addParty(payoutErgoTree, 'Payout');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');

		payoutParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: payoutNFT, amount: 1n }]
			},
			{
				R4: SInt(0).toHex()
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

		const payoutOut = new OutputBuilder(minStorageRent, payoutParty.address)
			.addTokens([{ tokenId: payoutNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(BigInt(mockChain.height))).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + (bankReservesXIn - bankReservesXOut),
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const mainInputs = [
			...payoutParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(payoutOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});

	it.skip('Payout should fail if taken too early', () => {
		const bankReservesXIn = 1_000_000_000_000n;
		const bankReservesYIn = initialDexyTokens - 100_000n;
		const bankReservesXOut = bankReservesXIn - bankReservesXIn / 200n;
		const bankReservesYOut = bankReservesYIn;
		const oracleRateXy = 10_000n * 1_000_000n;

		const payoutParty = mockChain.addParty(payoutErgoTree, 'Payout');
		const bankParty = mockChain.addParty(bankErgoTree, 'Bank');
		const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
		const fundingParty = mockChain.addParty(fakeScriptErgoTree, 'Funding');
		const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');

		payoutParty.addBalance(
			{
				nanoergs: minStorageRent,
				tokens: [{ tokenId: payoutNFT, amount: 1n }]
			},
			{
				R4: SInt(Number(BigInt(mockChain.height) - 5040n + 1n)).toHex()
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

		const payoutOut = new OutputBuilder(minStorageRent, payoutParty.address)
			.addTokens([{ tokenId: payoutNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(BigInt(mockChain.height))).toHex()
			});

		const bankOut = new OutputBuilder(bankReservesXOut, bankParty.address).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyUSD, amount: bankReservesYOut }
		]);

		const buybackOut = new OutputBuilder(
			fakeNanoErgs + (bankReservesXIn - bankReservesXOut),
			buybackParty.address
		).addTokens([{ tokenId: buybackNFT, amount: 1n }]);

		const mainInputs = [
			...payoutParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];
		const dataInputs = [...oracleParty.utxos];

		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(payoutOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(fee)
			.sendChangeTo(fundingParty.address)
			.build();

		const executed = mockChain.execute(tx, { throw: false });
		expect(executed).toBe(false);
	});
});
