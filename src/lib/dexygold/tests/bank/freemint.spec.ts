import { directionBuy, directionSell, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import { debugArbmint, debugFreemint, debugRedeem } from '$lib/dexygold/debugContracts';
import { MockChain } from '@fleet-sdk/mock-chain';

import {
	vitestTokenIds,
	vitestErgoTrees,
	realMintedTestBoxes,
	vitestContractConfig
} from '$lib/dexygold/dexyConstants';
import { bankMint, bankMintInpuErg, lpSwapInputDexy, lpSwapInputErg } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { applyFee, applyFeeSell, reverseFee, reverseFeeSell } from '$lib/sigmaUSDAndDexy';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBankFreeMintBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseLpMintBox,
	parseLpRedeemBox,
	parseLpSwapBox,
	parseTrackingBox
} from '$lib/stores/dexyGoldParser';
import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_lp_mint_box,
	dexygold_lp_redeem_box,
	dexygold_lp_swap_box,
	dexygold_tracking101_box,
	fakeUserBox,
	fakeUserWithDexyBox,
	initTestBoxes,
	mintInitialOutputs,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import { nanoErgToErg } from '$lib/TransactionUtils';
import {
	ErgoUnsignedInput,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { before } from 'node:test';
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

const { initialDexyTokens, initialLp, feeNumLp, feeDenomLp } = vitestContractConfig;
const dummyTokenId = '0000005aa0d95f5d54a7bc89c46730d9662397067250aa18a0039631c0f5b801';

// Constants from Scala code:
const fakeNanoErgs = 10_000_000_000_000n; // large funding
const dummyNanoErgs = 100_000n;
const minStorageRent = 1_000_000n;
const fee = 1_000_000n;

// If you want to replicate the Scala "changeAddress" as "fakeScript":
const changeAddress = fakeScriptErgoTree;
// const dexyUSD = dexyTokenId;
// const lpToken = lpTokenId;
export function calculateLpMintInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractErg * supplyLpIn) / lpXIn;
	const contractDexy = (contractErg * (lpYIn * supplyLpIn)) / (supplyLpIn * lpXIn) + 1n; //roundUp bigInt + low values
	// console.log('contractErg', contractErg);
	// console.log('lpYIn * supplyLpIn', lpYIn * supplyLpIn);
	// console.log('contractErg*lpYIn * supplyLpIn', contractErg * lpYIn * supplyLpIn);
	// console.log(
	// 	'contractErg*lpYIn * supplyLpIn/supplyLpIn',
	// 	(contractErg * lpYIn * supplyLpIn) / supplyLpIn
	// );
	// console.log(
	// 	'contractErg*lpYIn * supplyLpIn/supplyLpIn/lpXIn',
	// 	(contractErg * lpYIn * supplyLpIn) / supplyLpIn / lpXIn
	// );

	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpMintInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractDexy * supplyLpIn) / lpYIn;
	const contractErg = (contractDexy * supplyLpIn * lpXIn) / (lpYIn * supplyLpIn) + 1n; //RoundUp
	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpMintInputSharesUnlocked(
	contractLpTokens: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractDexy = (contractLpTokens * lpYIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
	const contractErg = (contractLpTokens * lpXIn) / supplyLpIn + 1n; // change to +1n //<==== NEED TO ROUND UP BigNumber.js?
	return { contractDexy, contractErg, contractLpTokens };
}

export function calculateLpRedeemInputSharesUnlocked(
	contractLpTokens: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn) - 1n;
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn) - 1n;

	return { contractDexy, contractErg, contractLpTokens };
}
function calculateLpRedeemInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractErg) / (98n * lpXIn);
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;
	// const contractDexy =
	// 	(98n * (100n * supplyLpIn * contractErg) * lpYIn) / (100n * supplyLpIn * 98n * lpXIn //- 1n;
	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}
function calculateLpRedeemInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractDexy) / (98n * lpYIn);
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;
	//const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;
	//const contractErg  = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;
	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}

describe('Bank Mint with any input should work', async () => {
	let mockChain: MockChain;
	let height = 1449119 + 11;
	// Start each test with a fresh chain at height ~1M
	mockChain = new MockChain({ height: height });
	let freeMintIn;
	let bankIn;
	let buybankIn;
	let lpIn;
	let goldOracle;

	let ergoInput;
	let feeMining;
	let userAddress;
	let userChangeAddress;

	let freeMintXIn;
	let freeMintNFT;
	let R4ResetHeight;
	let R5AwailableAmount;

	let bankXIn;
	let bankNFT;
	let bankYIn;
	let buybackXIn;
	let buybackNFT;
	let gortAmount;

	let lpYData;
	let lpXData;
	let lpTokenAmount;

	let oraclePoolNFT;
	let oracleRateData;

	let dataInputs;
	let userUtxos;

	const T_free = 360n;
	const T_arb = 30n;
	const thresholdPercent = 101n;
	const T_buffer = 5n;
	const bankFeeNum = 3n;
	const buybackFeeNum = 2n;
	const feeDenom = 1000n;

	let lpRate;
	let oracleRate;

	let dexyMinted;

	let contractErg;
	let bankErgsAdded;
	let buybackErgsAdded;
	let bankRate;
	let buybackRate;

	let maxAllowedIfReset;
	let remainingDexyIn;
	let remainingDexyOut;
	let bankXOut;
	let bankYOut;
	let buybackXOut;
	let freeMintXOut;

	let isCounterReset;

	let availableToMint;
	let resetHeightIn;
	let resetHeightOut;

	let buybackBoxIn;
	let bankOut;
	let freeMintOut;
	let buybackOut;

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
			R5AwailableAmount
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

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyMinted
		));
		remainingDexyIn = R5AwailableAmount;
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
			availableToMint = R5AwailableAmount; //
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
		//const bob = mockChain.newParty("Bob");
		//fundingParty = mockChain.addParty(fakeUserWithDexyBox.ergoTree, 'Funding');
		fundingParty = mockChain.newParty('Funding');
		fundingParty.addBalance(
			{
				nanoergs: fakeUserWithDexyBox.value,
				tokens: fakeUserWithDexyBox.assets
			})

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
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC);
		expect(signedTx).toBeTruthy();
	});

	it.only('Free mint - RESET  MochChain', () => {
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
