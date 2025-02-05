import { UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import {
	vitestTokenIds,
	vitestErgoTrees,
	vitestContractConfig,
	DEXY_GOLD
} from '$lib/dexygold/dexyConstants';
import { bankMint } from '$lib/dexygold/dexyGold';
import { signTx } from '$lib/dexygold/signing';
import { BOB_MNEMONIC } from '$lib/private/mnemonics';
import { reverseFee } from '$lib/sigmausd/sigmaUSDAndDexy';
import type { NodeBox } from '$lib/stores/bank.types';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseTrackingBox
} from '$lib/stores/dexyGoldParser';
import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_tracking101_box,
	fakeUserWithDexyBox,
	initTestBoxes,
	oracle_erg_xau_box
} from '$lib/stores/dexyGoldStore';
import type { EIP12UnsignedTransaction } from '@fleet-sdk/common';
import {
	ErgoUnsignedInput,
	OutputBuilder,
	RECOMMENDED_MIN_FEE_VALUE,
	SInt,
	SLong,
	TransactionBuilder
} from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { beforeAll, describe, expect, it } from 'vitest';

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
	dexyTokenId
} = vitestTokenIds;

const { initialDexyTokens, initialLp, feeNumLp, feeDenomLp } = vitestContractConfig;

// -------------------------------------------------------------------------------------

// fabric:

function calculateResetAndAmountArbMint(
	height: number,
	resetHeight: bigint,
	availableAmount: bigint,
	dexyMinted: bigint,
	maxAllowedIfReset: bigint,
	tArb: bigint,
	tBuffer: bigint
) {
	const isCounterReset = BigInt(height) > resetHeight;

	if (isCounterReset) {
		const resetHeightOut = height + Number(tArb + tBuffer - 1n);
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	} else {
		const resetHeightOut = resetHeight;
		const remainingDexyOut = availableAmount - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	}
}

type DexyGoldArbitrageInputs = {
	arbMintIn: NodeBox;
	bankIn: NodeBox;
	buybankIn: NodeBox;
	lpIn: NodeBox;
	goldOracle: NodeBox;
	tracking101: NodeBox;
};

function dexyGoldBankArbitrageInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	arbState: DexyGoldArbitrageInputs
): EIP12UnsignedTransaction {
	const { T_arb, T_free, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;

	const {
		value: arbMintXIn,
		arbitrageMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankArbitrageMintBox(arbState.arbMintIn);
	const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(arbState.bankIn);
	const { value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(arbState.buybankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);
	const { trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } = parseTrackingBox(
		arbState.tracking101
	);

	const dataInputs = [arbState.goldOracle, arbState.lpIn, arbState.tracking101];
	const userUtxos = utxos; //<== rename

	const userAddress = userBase58PK; //<== rename
	const userChangeAddress = userAddress; //<== delete after

	let buybackBoxIn = new ErgoUnsignedInput(arbState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	//--------------- Calculations -------------

	//data process:
	const lpRate = lpXData / lpYData; //<===
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const dexyContract = inputDexy; //<===

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
		oracleRate,
		1n,
		bankFeeNum,
		buybackFeeNum,
		feeDenom,
		dexyContract
	);
	const oracleRateWithFee = bankRate + buybackRate;

	// FEE  ------------------------------
	//Part 0 - use Fee Reversed
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const dexyMinted = dexyContract; //<===

	const remainingDexyIn = R5AvailableAmount;
	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
	//maxAllowedIfReset = lpYData / 100n; //free

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - dexyMinted;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	//freeMintXOut = freeMintXIn;
	const arbMintXOut = arbMintXIn;

	const resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

	const { isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountArbMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		dexyMinted,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	//------------------------------
	const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(arbMintXOut, arbitrageMintErgoTree)
		.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gort, amount: gortAmount }
	]);

	const swapFeeBox = new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS);

	const unsignedTx = new TransactionBuilder(height)
		.from([arbState.arbMintIn, arbState.bankIn, buybackBoxIn, ...userUtxos], {
			ensureInclusion: true
		})
		.withDataFrom(dataInputs)
		.to(arbMintOut)
		.to(bankOut)
		.to(buybackOut)
		.to(swapFeeBox)
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

describe('Bank Mint with any input should work', async () => {
	let height = 1449119 + 11;
	//MAIN DECLARATION:
	//let freeMintIn,freeMintXIn,freeMintXOut, freeMintNFT, R4ResetHeight, R5AvailableAmount;
	let arbMintIn, arbMintXIn, arbMintXOut, arbitrageMintNFT, R4ResetHeight, R5AvailableAmount;
	let bankIn, bankXIn, bankNFT, bankYIn;
	let buybankIn, buybackXIn, buybackNFT, gortAmount;

	let lpIn, lpYData, lpXData, lpTokenAmount;
	let goldOracle, oraclePoolNFT, oracleRateData;

	let tracking, trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight;

	let feeMining, userAddress, userChangeAddress;

	let dataInputs;
	let userUtxos;

	let ergoInput, dexyInput;
	let dexyMinted;

	const T_arb = 30n,
		T_free = 360n,
		T_buffer = 5n;
	const bankFeeNum = 3n,
		buybackFeeNum = 2n,
		feeDenom = 1000n;

	let uiFeeAddress = '9eaX1P6KkckoZa2cc8Cn2iL3tjsUL5MN9CQCTPCE1GbcaZwcqns';

	const thresholdPercent = 101n;

	let lpRate, oracleRate, oracleRateWithFee;

	let contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate;
	let maxAllowedIfReset, remainingDexyIn, remainingDexyOut;
	let bankXOut, bankYOut, buybackXOut;
	let isCounterReset;

	let availableToMint;
	let resetHeightIn;
	let resetHeightOut;

	let buybackBoxIn; //with Var[0]
	let bankOut, freeMintOut, buybackOut;
	// ------ MockChain DECLARATION ------
	beforeAll(async () => {
		await initTestBoxes();

		//------------------------------------------------------------
		//load boxes ARB mint:
		{
			arbMintIn = get(dexygold_bank_arbitrage_mint_box);
			({
				value: arbMintXIn,
				arbitrageMintNFT,
				R4ResetHeight,
				R5AvailableAmount
			} = parseBankArbitrageMintBox(arbMintIn));

			bankIn = get(dexygold_bank_box);
			({ value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(bankIn));

			buybankIn = get(dexygold_buyback_box);
			({ value: buybackXIn, buybackNFT, gortAmount } = parseBuybackBox(buybankIn));

			lpIn = get(dexygold_lp_box);
			({ dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(lpIn));

			goldOracle = get(oracle_erg_xau_box);
			({ oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(goldOracle));

			tracking = get(dexygold_tracking101_box);
			({ trackingNFT, R4Target, R5Denom, R6IsBelow, R7TriggeredHeight } =
				parseTrackingBox(tracking));

			dataInputs = [goldOracle, lpIn, tracking];
			userUtxos = [fakeUserWithDexyBox];

			feeMining = RECOMMENDED_MIN_FEE_VALUE;
			userAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
			userChangeAddress = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';
		}
		//load boxes FREE mint: {}

		//calculate:
		// add Variable to data input
		buybackBoxIn = new ErgoUnsignedInput(buybankIn);
		buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

		// //------------------------------------------------------------

		// dexyInput = 3000n - 1n;

		// //data process:
		// lpRate = lpXData / lpYData; //<===
		// oracleRate = oracleRateData / 1_000_000n;

		// // FEE ------------------------------
		// const dexyContract = dexyInput; //<===

		// ({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
		// 	oracleRate,
		// 	1n,
		// 	bankFeeNum,
		// 	buybackFeeNum,
		// 	feeDenom,
		// 	dexyContract
		// ));
		// oracleRateWithFee = bankRate + buybackRate;

		// // FEE  ------------------------------
		// dexyMinted = dexyContract; //<===

		// remainingDexyIn = R5AvailableAmount;
		// maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
		// //maxAllowedIfReset = lpYData / 100n; //free

		// remainingDexyOut = maxAllowedIfReset - dexyMinted;

		// bankXOut = bankXIn + bankErgsAdded;
		// bankYOut = bankYIn - dexyMinted;
		// buybackXOut = buybackXIn + buybackErgsAdded;

		// //freeMintXOut = freeMintXIn;
		// arbMintXOut = arbMintXIn;

		// resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

		// ({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountArbMint(
		// 	height,
		// 	R4ResetHeight,
		// 	R5AvailableAmount,
		// 	dexyMinted,
		// 	maxAllowedIfReset,
		// 	T_arb,
		// 	T_buffer
		// ));
	});

	it('Arbitrage No Fee	: Not reset : Input Dexy', async () => {
		dexyInput = 3000n - 1n;

		//data process:
		lpRate = lpXData / lpYData; //<===
		oracleRate = oracleRateData / 1_000_000n;

		// FEE ------------------------------
		const dexyContract = dexyInput; //<===

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyContract
		));
		oracleRateWithFee = bankRate + buybackRate;

		// FEE  ------------------------------
		dexyMinted = dexyContract; //<===

		remainingDexyIn = R5AvailableAmount;
		maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
		//maxAllowedIfReset = lpYData / 100n; //free

		remainingDexyOut = maxAllowedIfReset - dexyMinted;

		bankXOut = bankXIn + bankErgsAdded;
		bankYOut = bankYIn - dexyMinted;
		buybackXOut = buybackXIn + buybackErgsAdded;

		//freeMintXOut = freeMintXIn;
		arbMintXOut = arbMintXIn;

		resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

		({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountArbMint(
			height,
			R4ResetHeight,
			R5AvailableAmount,
			dexyMinted,
			maxAllowedIfReset,
			T_arb,
			T_buffer
		));

		//user Inputs
		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const arbMintOut = new OutputBuilder(arbMintXOut, arbitrageMintErgoTree)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const unsignedTx = new TransactionBuilder(height)
			.from([arbMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});

	it('Arbitrage With Fee	: Not reset : Input Dexy', async () => {
		//CALC
		dexyInput = 3000n - 1n;

		//data process:
		lpRate = lpXData / lpYData; //<===
		oracleRate = oracleRateData / 1_000_000n;

		// FEE ------------------------------
		const dexyContract = dexyInput; //<===

		({ contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } = bankMint(
			oracleRate,
			1n,
			bankFeeNum,
			buybackFeeNum,
			feeDenom,
			dexyContract
		));
		oracleRateWithFee = bankRate + buybackRate;

		// FEE  ------------------------------
		//Part 0 - use Fee Reversed
		const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

		dexyMinted = dexyContract; //<===

		remainingDexyIn = R5AvailableAmount;
		maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
		//maxAllowedIfReset = lpYData / 100n; //free

		remainingDexyOut = maxAllowedIfReset - dexyMinted;

		bankXOut = bankXIn + bankErgsAdded;
		bankYOut = bankYIn - dexyMinted;
		buybackXOut = buybackXIn + buybackErgsAdded;

		//freeMintXOut = freeMintXIn;
		arbMintXOut = arbMintXIn;

		resetHeightIn = R4ResetHeight; //--- --- --- --- --- --- --- ---

		({ isCounterReset, resetHeightOut, remainingDexyOut } = calculateResetAndAmountArbMint(
			height,
			R4ResetHeight,
			R5AvailableAmount,
			dexyMinted,
			maxAllowedIfReset,
			T_arb,
			T_buffer
		));

		//user Inputs
		//------------------------------
		const bankOut = new OutputBuilder(bankXOut, bankErgoTree).addTokens([
			{ tokenId: bankNFT, amount: 1n },
			{ tokenId: dexyTokenId, amount: bankYOut }
		]);

		const arbMintOut = new OutputBuilder(arbMintXOut, arbitrageMintErgoTree)
			.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
			.setAdditionalRegisters({
				R4: SInt(Number(resetHeightOut)).toHex(),
				R5: SLong(BigInt(remainingDexyOut)).toHex()
			});

		const buybackOut = new OutputBuilder(buybackXOut, buybackErgoTree).addTokens([
			{ tokenId: buybackNFT, amount: 1n },
			{ tokenId: gort, amount: gortAmount }
		]);

		const swapFeeBox = new OutputBuilder(uiSwapFee, uiFeeAddress);

		const unsignedTx = new TransactionBuilder(height)
			.from([arbMintIn, bankIn, buybackBoxIn, ...userUtxos], {
				ensureInclusion: true
			})
			.withDataFrom(dataInputs)
			.to(arbMintOut)
			.to(bankOut)
			.to(buybackOut)
			.to(swapFeeBox)
			.payFee(feeMining)
			.sendChangeTo(userChangeAddress)
			.build()
			.toEIP12Object();

		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
	it('Arbitrage With Fee oneFunction	: Not reset : Input Dexy', async () => {
		//CALC
		dexyInput = 3000n - 1n;
		const unsignedTx = dexyGoldBankArbitrageInputDexyTx(
			dexyInput,
			userAddress,
			height,
			feeMining,
			[fakeUserWithDexyBox],
			{ arbMintIn, bankIn, buybankIn, lpIn, goldOracle, tracking101: tracking }
		);
		const signedTx = await signTx(unsignedTx, BOB_MNEMONIC, height);
		expect(signedTx).toBeTruthy();
	});
});
