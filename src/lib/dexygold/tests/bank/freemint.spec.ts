import { debugFreemint } from '$lib/dexygold/debugContracts';
import { MockChain } from '@fleet-sdk/mock-chain';

import { vitestTokenIds, vitestErgoTrees } from '$lib/dexygold/dexyConstants';
import { calculateBankMintInputDexy } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import {
	parseBankBox,
	parseBankFreeMintBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox
} from '$lib/stores/dexyGoldParser';
import {
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import { fakeUserWithDexyBox, initTestBoxes } from '$lib/stores/dexyGoldStoreTestData';
import {
	ErgoUnsignedInput,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// take input from

const {
	trackingErgoTree,
	bankUpdateErgoTree,
	ballotErgoTree,
	interventionErgoTree,
	interventionUpdateErgoTree,
	buybackErgoTree,
	payoutErgoTree,
	freeMintErgoTree,
	bankErgoTree,
	arbitrageMintErgoTree,
	lpErgoTree,
	lpMintErgoTree,
	lpRedeemErgoTree,
	extractScriptErgoTree: extractErgoTree,
	extractUpdateErgoTree,
	swapErgoTree: lpSwapErgoTree,
	lpSwapBuyV1ErgoTree,
	lpSwapSellV1ErgoTree,
	oracleErgoTree,
	fakeScriptErgoTree
} = vitestErgoTrees;

const {
	gort,
	gortId,
	oracleTokenId,
	oraclePoolNFT,
	oracleNFT,
	gortDevEmissionNFT,
	gortLpNFT,
	buybackNFT,
	lpNFT,
	lpSwapNFT,
	lpMintNFT,
	lpRedeemNFT,
	lpTokenId,
	tracking95NFT,
	tracking98NFT,
	tracking101NFT,
	bankNFT,
	updateNFT,
	ballotTokenId,
	interventionNFT,
	extractionNFT,
	arbitrageMintNFT,
	freeMintNFT,
	payoutNFT,
	dexyTokenId,
	dexyUSD,
	lpToken
} = vitestTokenIds;

describe('Bank Mint with any input should work', async () => {
	let mockChain: MockChain;
	let height = 1449119 + 11;
	// Start each test with a fresh chain at height ~1M
	mockChain = new MockChain({ height: height });

	let freeMintIn, bankIn, buybankIn, lpIn, goldOracle;

	let ergoInput;
	let feeMining;
	let userAddress;
	let userChangeAddress;

	let freeMintXIn, freeMintNFT, R4ResetHeight, R5AvailableAmount;

	let bankXIn, bankNFT, bankYIn;
	let buybackXIn, buybackNFT, gortAmount;

	let lpYData, lpXData, lpTokenAmount;

	let oraclePoolNFT, oracleRateData;

	let dataInputs;
	let userUtxos;

	const T_free = 360n;
	const T_arb = 30n;
	const thresholdPercent = 101n;
	const T_buffer = 5n;
	const bankFeeNum = 3n;
	const buybackFeeNum = 2n;
	const feeDenom = 1000n;

	let lpRate, oracleRate;

	let dexyMinted;

	let contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate;

	let maxAllowedIfReset, remainingDexyIn, remainingDexyOut;
	let bankXOut, bankYOut, buybackXOut, freeMintXOut;

	let isCounterReset;

	let availableToMint;
	let resetHeightIn;
	let resetHeightOut;

	let buybackBoxIn; //with Var[0]
	let bankOut, freeMintOut, buybackOut;

	let fundingParty;
	const buybackParty = mockChain.addParty(buybackErgoTree, 'Buyback');
	const oracleParty = mockChain.addParty(fakeScriptErgoTree, 'Oracle');
	const lpParty = mockChain.addParty(lpErgoTree, 'LpBox');
	const freeMintParty = mockChain.addParty(freeMintErgoTree, 'FreeMint');
	const bankParty = mockChain.addParty(bankErgoTree, 'Bank');

	beforeAll(async () => {
		await initTestBoxes();

		dexyMinted = 3000n - 1n;

		freeMintIn = get(dexygold_bank_free_mint_box);
		({
			value: freeMintXIn,
			freeMintNFT,
			R4ResetHeight,
			R5AvailableAmount
		} = parseBankFreeMintBox(freeMintIn));

		bankIn = get(dexygold_bank_box);
		({ value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn));

		buybankIn = get(dexygold_buyback_box);
		({ value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn));

		lpIn = get(dexygold_lp_box);
		({ dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn));

		goldOracle = get(oracle_erg_xau_box);
		({ oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle));

		dataInputs = [goldOracle, lpIn]; //, tracking];
		userUtxos = [fakeUserWithDexyBox];

		//user Inputs
		height = 1449119 + 11; // + 10; //+10 = Reseted
		ergoInput = 1_000_000_000n;

		feeMining = RECOMMENDED_MIN_FEE_VALUE;
		userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

		lpRate = lpXData / lpYData;
		oracleRate = oracleRateData / 1_000_000n;

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
			calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyMinted));
		remainingDexyIn = R5AvailableAmount;
		maxAllowedIfReset = lpYData / 100n;
		remainingDexyOut = maxAllowedIfReset - dexyMinted;

		bankXOut = bankXIn + bankErgsAdded;
		bankYOut = bankYIn - dexyMinted;
		buybackXOut = buybackXIn + buybackErgsAdded;

		freeMintXOut = freeMintXIn;

		resetHeightIn = R4ResetHeight;
		resetHeightOut = height + Number(T_free + T_buffer - 1n);

		isCounterReset = height > R4ResetHeight;

		if (isCounterReset) {
			console.log('Reset +');
			resetHeightOut = height + Number(T_free + T_buffer - 1n); //<== //360 => 365
			availableToMint = maxAllowedIfReset;
			console.log('availableToMint ', availableToMint);
			remainingDexyOut = availableToMint - dexyMinted;
		} else {
			console.log('---NOT RESETED---');
			resetHeightOut = R4ResetHeight; //
			availableToMint = R5AvailableAmount; //
			if (remainingDexyIn < dexyMinted) {
				console.log('Not reset | Not enough Dexy');
			}
			remainingDexyOut = availableToMint - dexyMinted;
		}

		buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		//------------------------------
		bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		freeMintOut = new OutputBuilder(freeMintXOut, freeMintErgoTree)
			.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		// Setup inputs
		fundingParty = mockChain.newParty('Funding');
		fundingParty.addBalance({
			nanoergs: fakeUserWithDexyBox.value,
			tokens: fakeUserWithDexyBox.assets
		});

		buybackParty.withUTxOs(buybackBoxIn);
		oracleParty.withUTxOs(goldOracle);
		bankParty.withUTxOs(bankIn);
		lpParty.withUTxOs(lpIn);
		freeMintParty.withUTxOs(freeMintIn);
	});

	beforeEach(() => {
		let height = 1449119 + 11;
		// Start each test with a fresh chain at height ~1M
		mockChain = new MockChain({ height: height });
	});

	afterEach(() => {
		mockChain.reset();
	});

	it('Free mint - RESET  SignTx()', async () => {
		const unsignedTx = new TransactionBuilder(height)
			.from([freeMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		//console.dir(unsignedTx, { depth: null });
		debugFreemint(unsignedTx);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Free mint - RESET  MochChain', () => {
		// main + data inputs
		const mainInputs = [
			...freeMintParty.utxos,
			...bankParty.utxos,
			buybackBoxIn,
			...fundingParty.utxos
		];

		// Build TX
		const tx = new TransactionBuilder(mockChain.height)
			.from(mainInputs, { ensureInclusion: true })
			.withDataFrom(dataInputs)
			.to(freeMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build();

		debugFreemint(tx.toEIP12Object());

		//console.dir(tx.toEIP12Object(), { depth: null });
		// Execute => should pass
		const executed = mockChain.execute(tx, { signers: [fundingParty], throw: false });
		expect(executed).toBe(true);
	});
});
