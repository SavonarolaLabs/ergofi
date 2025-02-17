import { DIRECTION_BUY, DIRECTION_SELL, UI_FEE_ADDRESS } from '$lib/api/ergoNode';
import {
	applyFee,
	applyFeeSell,
	reverseFee,
	reverseFeeSell,
	type Direction
} from '$lib/sigmausd/sigmaUSDAndDexy';
import type { NodeBox } from '$lib/stores/bank.types';
import {
	parseBankArbitrageMintBox,
	parseBankBox,
	parseBankFreeMintBox,
	parseBuybackBox,
	parseDexyGoldOracleBox,
	parseLpBox,
	parseLpMintBox,
	parseLpRedeemBox,
	parseLpSwapBox
} from '$lib/stores/dexyGoldParser';
import { ErgoUnsignedInput, OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { SInt, SLong } from '@fleet-sdk/serializer';
import { DEXY_GOLD } from './dexyConstants';
import type { EIP12UnsignedTransaction } from '@fleet-sdk/common';
import type { DexyGoldNumbers } from '$lib/stores/dexyGoldStore';
import {
	anchor,
	getSwapTag,
	setAmount,
	swapAmount,
	type SwapIntention,
	type SwapItem,
	type SwapPreview
} from '$lib/swapIntention';
import { ERGO_TOKEN_ID } from '$lib/stores/ergoTokens';

export type LpDexySwapResult = {
	amountErg: bigint;
	amountDexy: bigint;
	rate: number;
};

export type DexyGoldLpSwapInputs = {
	lpSwapIn: NodeBox;
	lpIn: NodeBox;
};

export type DexyGoldLpMintInputs = {
	lpMintIn: NodeBox;
	lpIn: NodeBox;
};

export type DexyGoldLpRedeemInputs = {
	lpRedeemIn: NodeBox;
	lpIn: NodeBox;
	goldOracle: NodeBox;
};

export type DexyGoldBankArbitrageInputs = {
	arbMintIn: NodeBox;
	bankIn: NodeBox;
	buybankIn: NodeBox;
	lpIn: NodeBox;
	goldOracle: NodeBox;
	tracking101: NodeBox;
};

export type DexyGoldBankFreeInputs = {
	freeMintIn: NodeBox;
	bankIn: NodeBox;
	buybankIn: NodeBox;
	lpIn: NodeBox;
	goldOracle: NodeBox;
};

export type DexyGoldExtendedSwapInputs = {
	lpSwapIn: NodeBox;
	lpIn: NodeBox;
	freeMintIn: NodeBox;
	arbMintIn: NodeBox;
	bankIn: NodeBox;
	buybankIn: NodeBox;
	goldOracle: NodeBox;
	tracking101: NodeBox;
};

export type DexyGoldUtxo = DexyGoldBankFreeInputs &
	DexyGoldBankArbitrageInputs &
	DexyGoldLpSwapInputs &
	DexyGoldLpMintInputs &
	DexyGoldLpRedeemInputs;

export type ErgToDexyGoldOptions = {
	lpSwapPrice: number;
	lpSwapAmount: bigint;

	bankArbBetterThanLp: boolean;
	bankArbPrice: number;
	bankArbAmount: bigint;

	bankFreeBetterThanLp: boolean;
	bankFreePrice: number;
	bankFreeAmount: bigint;

	bestAmount: bigint;
	bestPrice: number;
};

export type ErgToDexyGoldBestOption = {
	bestAmount: bigint;
	bestPrice: number;
};

//-------------- LP Swap --------------
// Calc
export function lpSwapInputErg(
	direction: bigint,
	amountErg: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
): LpDexySwapResult {
	const rate = Number(reservesYIn) / Number(reservesXIn);
	let amountDexy: bigint;

	if (direction === DIRECTION_SELL) {
		// OLD ONE
		// amountDexy = BigInt(Math.floor((Number(amountErg) * rate * Number(feeNumLp)) / Number(feeDenomLp))); //Round Down //- 1n;

		//amountDexy =< lpYIn* amountErg * 997n / (lpXIn * 1000n + amountErg * 997n)
		amountDexy =
			(reservesYIn * amountErg * feeNumLp) / (reservesXIn * feeDenomLp + amountErg * feeNumLp) - 1n; // =<
	} else {
		// OLD ONE
		// amountDexy = BigInt(
		// 	Math.ceil((Number(amountErg + 100n) * (Number(feeDenomLp) * rate)) / Number(feeNumLp)) //Round UP
		// );
		//DIRECTION_BUY
		amountDexy =
			(amountErg * reservesYIn * feeDenomLp) / (reservesXIn * feeNumLp - amountErg * feeNumLp) + 1n;
	}

	return { amountErg, amountDexy, rate };
}
export function lpSwapInputDexy(
	direction: bigint,
	amountDexy: bigint,
	reservesXIn: bigint,
	reservesYIn: bigint,
	feeNumLp: bigint,
	feeDenomLp: bigint
): LpDexySwapResult {
	const rate = Number(reservesYIn) / Number(reservesXIn);
	let amountErg;
	// in case amountDexy is OUTPUT

	if (direction == DIRECTION_SELL) {
		//amountDexy = 1000n;
		amountErg =
			(amountDexy * reservesXIn * feeDenomLp) / (reservesYIn * feeNumLp - amountDexy * feeNumLp) +
			1n; // cause >=?
	} else {
		//amountDexy = 1000n;
		amountErg =
			(reservesXIn * amountDexy * feeNumLp) / (reservesYIn * feeDenomLp + amountDexy * feeNumLp) -
			1n; // cause <=
	}

	return { amountErg, amountDexy, rate }; // as result amountErg, amountDexy
}
// Price and BUILD
export function dexyGoldLpSwapInputErgPrice(
	inputErg: bigint,
	direction: Direction,
	feeMining: bigint,
	swapState: DexyGoldLpSwapInputs
) {
	const { feeNumLp, feeDenomLp } = DEXY_GOLD;
	const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapState.lpSwapIn);

	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(swapState.lpIn);

	let uiSwapFee, contractErg;
	if (direction != DIRECTION_SELL) {
		({ uiSwapFee, contractErg } = applyFeeSell(inputErg, feeMining));
	} else {
		({ uiSwapFee, contractErg } = applyFee(inputErg, feeMining));
	}

	let { amountDexy, amountErg, rate } = lpSwapInputErg(
		direction,
		contractErg,
		lpXIn,
		lpYIn,
		feeNumLp,
		feeDenomLp
	);

	const price = Number(inputErg) / Number(amountDexy);

	return {
		amountErg,
		amountDexy,
		price,
		uiSwapFee,
		contractErg
	};
}
export function dexyGoldLpSwapInputErgTx(
	inputErg: bigint,
	direction: Direction,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	swapState: DexyGoldLpSwapInputs
): EIP12UnsignedTransaction {
	const { feeNumLp, feeDenomLp } = DEXY_GOLD;
	const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapState.lpSwapIn);

	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(swapState.lpIn);

	const { amountErg, amountDexy, uiSwapFee, contractErg } = dexyGoldLpSwapInputErgPrice(
		inputErg,
		direction,
		feeMining,
		swapState
	);

	const userUtxos = utxos; // Можем переименовать по необходимости
	const userAddress = userBase58PK; // Аналогично
	const userChangeAddress = userAddress;

	const swapOutValue = swapInValue;
	const lpXOut = lpXIn - direction * amountErg;
	const lpYOut = lpYIn + direction * amountDexy;

	const unsignedTx = new TransactionBuilder(height)
		.from([swapState.lpIn, swapState.lpSwapIn, ...userUtxos], {
			ensureInclusion: true
		})
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensIn },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(swapOutValue, DEXY_GOLD.swapErgoTree).addTokens([
				{ tokenId: lpSwapNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}
export function dexyGoldLpSwapInputDexyPrice(
	inputDexy: bigint,
	direction: Direction,
	feeMining: bigint,
	swapState: DexyGoldLpSwapInputs
) {
	const { feeNumLp, feeDenomLp } = DEXY_GOLD;
	const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapState.lpSwapIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(swapState.lpIn);

	let uiSwapFee, amountErg;
	const {
		amountDexy,
		amountErg: contractERG,
		rate
	} = lpSwapInputDexy(direction, inputDexy, lpXIn, lpYIn, feeNumLp, feeDenomLp);

	if (direction == DIRECTION_SELL) {
		({ inputErg: amountErg, uiSwapFee } = reverseFee(contractERG, feeMining));
	} else {
		({ userErg: amountErg, uiSwapFee } = reverseFeeSell(contractERG, feeMining));
	}

	const price = Number(amountErg) / Number(inputDexy);
	return { amountErg, amountDexy: inputDexy, price, uiSwapFee };
}
export function dexyGoldLpSwapInputDexyTx(
	inputDexy: bigint,
	direction: Direction,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	swapState: DexyGoldLpSwapInputs
): EIP12UnsignedTransaction {
	const { value: swapInValue, lpSwapNFT } = parseLpSwapBox(swapState.lpSwapIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(swapState.lpIn);

	const { amountErg, amountDexy, uiSwapFee } = dexyGoldLpSwapInputDexyPrice(
		inputDexy,
		direction,
		feeMining,
		swapState
	);

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const swapOutValue = swapInValue;
	const lpXOut = lpXIn - direction * amountErg;
	const lpYOut = lpYIn + direction * amountDexy;

	const unsignedTx = new TransactionBuilder(height)
		.from([swapState.lpIn, swapState.lpSwapIn, ...userUtxos], {
			ensureInclusion: true
		})
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensIn },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(swapOutValue, DEXY_GOLD.swapErgoTree).addTokens([
				{ tokenId: lpSwapNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

//-------------- LP Mint --------------
// Calc
export function calculateLpMintInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	const contractLpTokens: bigint = (contractErg * supplyLpIn) / lpXIn;
	const contractDexy = (contractErg * (lpYIn * supplyLpIn)) / (supplyLpIn * lpXIn) + 1n; //roundUp bigInt + low values

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
// BUILD

export function dexyGoldLpMintInputErgPrice(
	inputErg: bigint,
	feeMining: bigint,
	mintState: DexyGoldLpMintInputs
) {
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { uiSwapFee, contractErg } = applyFee(inputErg, feeMining, 2n);
	const { contractDexy, contractLpTokens: sharesUnlocked } = calculateLpMintInputErg(
		contractErg,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const price = Number(sharesUnlocked) / Number(inputErg);

	return { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price };
}
export function dexyGoldLpMintInputErgTx(
	inputErg: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	mintState: DexyGoldLpMintInputs
): EIP12UnsignedTransaction {
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);

	const { uiSwapFee, contractErg, contractDexy, sharesUnlocked } = dexyGoldLpMintInputErgPrice(
		inputErg,
		feeMining,
		mintState
	);

	const lpMintOutValue = lpMintInValue;
	const lpXOut = lpXIn + contractErg;
	const lpYOut = lpYIn + contractDexy;
	const lpTokensOut = lpTokensIn - sharesUnlocked;

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const unsignedTx = new TransactionBuilder(height)
		.from([mintState.lpIn, mintState.lpMintIn, ...userUtxos], {
			ensureInclusion: true
		})
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpMintOutValue, DEXY_GOLD.lpMintErgoTree).addTokens([
				{ tokenId: lpMintNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

export function dexyGoldLpMintInputDexyPrice(
	inputDexy: bigint,
	feeMining: bigint,
	mintState: DexyGoldLpMintInputs
) {
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { contractErg, contractLpTokens: sharesUnlocked } = calculateLpMintInputDexy(
		inputDexy,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const { uiSwapFee, inputErg } = reverseFee(contractErg, feeMining, 2n);
	const contractDexy = inputDexy;
	const price = Number(sharesUnlocked) / Number(inputErg);
	return { uiSwapFee, inputErg, contractDexy, contractErg, sharesUnlocked, price };
}
export function dexyGoldLpMintInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	mintState: DexyGoldLpMintInputs
): EIP12UnsignedTransaction {
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);
	const { uiSwapFee, inputErg, contractDexy, contractErg, sharesUnlocked } =
		dexyGoldLpMintInputDexyPrice(inputDexy, feeMining, mintState);
	const lpMintOutValue = lpMintInValue;
	const lpXOut = lpXIn + contractErg;
	const lpYOut = lpYIn + contractDexy;
	const lpTokensOut = lpTokensIn - sharesUnlocked;
	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;
	const unsignedTx = new TransactionBuilder(height)
		.from([mintState.lpIn, mintState.lpMintIn, ...userUtxos], {
			ensureInclusion: true
		})
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpMintOutValue, DEXY_GOLD.lpMintErgoTree).addTokens([
				{ tokenId: lpMintNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();
	return unsignedTx;
}

export function dexyGoldLpMintInputSharesPrice(
	inputShares: bigint,
	feeMining: bigint,
	mintState: DexyGoldLpMintInputs
) {
	const sharesUnlocked = inputShares;
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { contractErg, contractDexy } = calculateLpMintInputSharesUnlocked(
		sharesUnlocked,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const { uiSwapFee, inputErg } = reverseFee(contractErg, feeMining, 2n);
	const price = Number(sharesUnlocked) / Number(inputErg);
	return { uiSwapFee, inputErg, contractErg, contractDexy, sharesUnlocked, price };
}
export function dexyGoldLpMintInputSharesTx(
	inputShares: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	mintState: DexyGoldLpMintInputs
): EIP12UnsignedTransaction {
	const { value: lpMintInValue, lpMintNFT } = parseLpMintBox(mintState.lpMintIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(mintState.lpIn);
	const { uiSwapFee, inputErg, contractErg, contractDexy, sharesUnlocked } =
		dexyGoldLpMintInputSharesPrice(inputShares, feeMining, mintState);

	const lpMintOutValue = lpMintInValue;
	const lpXOut = lpXIn + contractErg;
	const lpYOut = lpYIn + contractDexy;
	const lpTokensOut = lpTokensIn - sharesUnlocked;

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const unsignedTx = new TransactionBuilder(height)
		.from([mintState.lpIn, mintState.lpMintIn, ...userUtxos], {
			ensureInclusion: true
		})
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpMintOutValue, DEXY_GOLD.lpMintErgoTree).addTokens([
				{ tokenId: lpMintNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

//-------------- LP Redeem --------------
// Calc
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
export function calculateLpRedeemInputErg(
	contractErg: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractErg) / (98n * lpXIn);
	const contractDexy = (98n * contractLpTokens * lpYIn) / (100n * supplyLpIn); //- 1n;

	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}
export function calculateLpRedeemInputDexy(
	contractDexy: bigint,
	lpXIn: bigint,
	lpYIn: bigint,
	supplyLpIn: bigint
) {
	let contractLpTokens = (100n * supplyLpIn * contractDexy) / (98n * lpYIn);
	const contractErg = (98n * contractLpTokens * lpXIn) / (100n * supplyLpIn); //- 1n;

	contractLpTokens = contractLpTokens + 1n; // add after calc
	return { contractDexy, contractErg, contractLpTokens };
}

// BUILD
export function dexyGoldLpRedeemInputSharesPrice(
	inputShares: bigint,
	feeMining: bigint,
	redeemState: DexyGoldLpRedeemInputs
) {
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { contractErg, contractDexy } = calculateLpRedeemInputSharesUnlocked(
		inputShares,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const { uiSwapFee, userErg } = reverseFeeSell(contractErg, feeMining, 2n);
	const price = Number(inputShares) / Number(userErg);
	return { uiSwapFee, userErg, contractErg, contractDexy, price };
}
export function dexyGoldLpRedeemInputSharesTx(
	inputShares: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	redeemState: DexyGoldLpRedeemInputs
): EIP12UnsignedTransaction {
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);
	const { uiSwapFee, userErg, contractErg, contractDexy } = dexyGoldLpRedeemInputSharesPrice(
		inputShares,
		feeMining,
		redeemState
	);

	const lpRedeemOutValue = lpRedeemInValue;
	const lpXOut = lpXIn - contractErg;
	const lpYOut = lpYIn - contractDexy;
	const lpTokensOut = lpTokensIn + inputShares;

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const unsignedTx = new TransactionBuilder(height)
		.from([redeemState.lpIn, redeemState.lpRedeemIn, ...userUtxos], {
			ensureInclusion: true
		})
		.withDataFrom([redeemState.goldOracle])
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpRedeemOutValue, DEXY_GOLD.lpRedeemErgoTree).addTokens([
				{ tokenId: lpRedeemNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

export function dexyGoldLpRedeemInputDexyPrice(
	inputDexy: bigint,
	feeMining: bigint,
	redeemState: DexyGoldLpRedeemInputs
) {
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { contractLpTokens: sharesUnlocked, contractErg } = calculateLpRedeemInputDexy(
		inputDexy,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const { uiSwapFee, userErg } = reverseFeeSell(contractErg, feeMining, 2n);
	const price = Number(sharesUnlocked) / Number(userErg);
	return { uiSwapFee, userErg, contractErg, sharesUnlocked, price };
}
export function dexyGoldLpRedeemInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	redeemState: DexyGoldLpRedeemInputs
): EIP12UnsignedTransaction {
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);

	const { uiSwapFee, userErg, contractErg, sharesUnlocked } = dexyGoldLpRedeemInputDexyPrice(
		inputDexy,
		feeMining,
		redeemState
	);

	const lpRedeemOutValue = lpRedeemInValue;
	const lpXOut = lpXIn - contractErg;
	const lpYOut = lpYIn - inputDexy;
	const lpTokensOut = lpTokensIn + sharesUnlocked;

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const unsignedTx = new TransactionBuilder(height)
		.from([redeemState.lpIn, redeemState.lpRedeemIn, ...userUtxos], {
			ensureInclusion: true
		})
		.withDataFrom([redeemState.goldOracle])
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpRedeemOutValue, DEXY_GOLD.lpRedeemErgoTree).addTokens([
				{ tokenId: lpRedeemNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

export function dexyGoldLpRedeemInputErgPrice(
	inputErg: bigint,
	feeMining: bigint,
	redeemState: DexyGoldLpRedeemInputs
) {
	const { feeNumLp, feeDenomLp, initialLp } = DEXY_GOLD;
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);
	const supplyLpIn = initialLp - lpTokensIn;
	const { uiSwapFee, contractErg } = applyFeeSell(inputErg, feeMining, 2n);
	const { contractLpTokens: sharesUnlocked, contractDexy } = calculateLpRedeemInputErg(
		contractErg,
		lpXIn,
		lpYIn,
		supplyLpIn
	);
	const price = Number(sharesUnlocked) / Number(inputErg);
	return { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price };
}
export function dexyGoldLpRedeemInputErgTx(
	inputErg: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	redeemState: DexyGoldLpRedeemInputs
): EIP12UnsignedTransaction {
	const { value: lpRedeemInValue, lpRedeemNFT } = parseLpRedeemBox(redeemState.lpRedeemIn);
	const {
		dexyAmount: lpYIn,
		value: lpXIn,
		lpTokenAmount: lpTokensIn,
		lpNFT,
		lpTokenId,
		lpDexyTokenId
	} = parseLpBox(redeemState.lpIn);
	const { uiSwapFee, contractErg, contractDexy, sharesUnlocked } = dexyGoldLpRedeemInputErgPrice(
		inputErg,
		feeMining,
		redeemState
	);

	const lpRedeemOutValue = lpRedeemInValue;
	const lpXOut = lpXIn - contractErg;
	const lpYOut = lpYIn - contractDexy;
	const lpTokensOut = lpTokensIn + sharesUnlocked;

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const unsignedTx = new TransactionBuilder(height)
		.from([redeemState.lpIn, redeemState.lpRedeemIn, ...userUtxos], {
			ensureInclusion: true
		})
		.withDataFrom([redeemState.goldOracle])
		.to(
			new OutputBuilder(lpXOut, DEXY_GOLD.lpErgoTree).addTokens([
				{ tokenId: lpNFT, amount: 1n },
				{ tokenId: lpTokenId, amount: lpTokensOut },
				{ tokenId: lpDexyTokenId, amount: lpYOut }
			])
		)
		.to(
			new OutputBuilder(lpRedeemOutValue, DEXY_GOLD.lpRedeemErgoTree).addTokens([
				{ tokenId: lpRedeemNFT, amount: 1n }
			])
		)
		.to(new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS))
		.payFee(feeMining)
		.sendChangeTo(userChangeAddress)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

//--------------Calc Bank--------------
export function calculateBankMintInputDexy(
	oracleRateXy: bigint, // oracle x 1_000_000 ???
	scale: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	contractDexy: bigint
) {
	//const scale = 1_000_000n;

	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / (feeDenom * scale);
	const buybackRate = (oracleRateXy * buybackFeeNum) / (feeDenom * scale);

	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	const contractErg = bankErgsAdded + buybackErgsAdded;

	return { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate }; // as result contractDexy, contractErg , bankErgsAdded, buybackErgsAdded
}
export function calculateBankMintInputErg(
	oracleRateXy: bigint,
	scale: bigint,
	bankFeeNum: bigint,
	buybackFeeNum: bigint,
	feeDenom: bigint,
	totalErgs: bigint
) {
	const bankRate = (oracleRateXy * (bankFeeNum + feeDenom)) / feeDenom / scale;
	const buybackRate = (oracleRateXy * buybackFeeNum) / feeDenom / scale;

	const contractDexy = totalErgs / (bankRate + buybackRate);
	const bankErgsAdded = bankRate * contractDexy;
	const buybackErgsAdded = buybackRate * contractDexy;

	return { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate };
}

export function calculateResetAndAmountMint(
	height: number,
	resetHeight: bigint,
	availableAmount: bigint,
	dexyMinted: bigint,
	maxAllowedIfReset: bigint,
	tMint: bigint,
	tBuffer: bigint
) {
	const isCounterReset = BigInt(height) > resetHeight;

	if (isCounterReset) {
		const resetHeightOut = height + Number(tMint + tBuffer - 1n);
		const remainingDexyOut = maxAllowedIfReset - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	} else {
		const resetHeightOut = resetHeight;
		const remainingDexyOut = availableAmount - dexyMinted;
		return { isCounterReset, resetHeightOut, remainingDexyOut };
	}
}
// BUILD

export function dexyGoldBankFreeInputErgPrice(
	inputErg: bigint,
	feeMining: bigint,
	freeState: DexyGoldBankFreeInputs
) {
	const { T_free, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;
	const {
		value: freeMintXIn,
		freeMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankFreeMintBox(freeState.freeMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(freeState.bankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(freeState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);
	const oracleRate = oracleRateData / 1_000_000n;
	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);
	const { contractDexy, bankErgsAdded, buybackErgsAdded } = calculateBankMintInputErg(
		oracleRate,
		1n,
		bankFeeNum,
		buybackFeeNum,
		feeDenom,
		contractErg
	);
	const maxAllowedIfReset = lpYData / 100n;
	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn,
		bankErgsAdded,
		buybackErgsAdded
	};
}
export function dexyGoldBankFreeInputErgTx(
	inputErg: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	freeState: DexyGoldBankFreeInputs
): EIP12UnsignedTransaction {
	const { T_free, T_buffer_5: T_buffer } = DEXY_GOLD;
	const {
		value: freeMintXIn,
		freeMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankFreeMintBox(freeState.freeMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(freeState.bankIn);
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(freeState.buybankIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);
	const dataInputs = [freeState.goldOracle, freeState.lpIn];

	const buybackBoxIn = new ErgoUnsignedInput(freeState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const {
		amountErg,
		amountDexy,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount,
		bankDexy,
		bankErgsAdded,
		buybackErgsAdded
	} = dexyGoldBankFreeInputErgPrice(inputErg, feeMining, freeState);

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - amountDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;
	const freeMintXOut = freeMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		amountDexy,
		maxAllowedIfReset,
		T_free,
		T_buffer
	);

	const bankOut = new OutputBuilder(bankXOut, DEXY_GOLD.bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(freeMintXOut, DEXY_GOLD.freeMintErgoTree)
		.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, DEXY_GOLD.buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gortTokenId, amount: gortAmount }
	]);

	const swapFeeBox = new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS);

	const unsignedTx = new TransactionBuilder(height)
		.from([freeState.freeMintIn, freeState.bankIn, buybackBoxIn, ...userUtxos], {
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

export function dexyGoldBankFreeInputDexyPrice(
	inputDexy: bigint,
	feeMining: bigint,
	freeState: DexyGoldBankFreeInputs
) {
	const { T_free, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;
	const {
		value: freeMintXIn,
		freeMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankFreeMintBox(freeState.freeMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(freeState.bankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(freeState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);

	const oracleRate = oracleRateData / 1_000_000n;
	const contractDexy = inputDexy;
	const { contractErg, bankErgsAdded, buybackErgsAdded } = calculateBankMintInputDexy(
		oracleRate,
		1n,
		bankFeeNum,
		buybackFeeNum,
		feeDenom,
		contractDexy
	);
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);
	const maxAllowedIfReset = lpYData / 100n;
	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn,
		bankErgsAdded,
		buybackErgsAdded
	};
}
export function dexyGoldBankFreeInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	freeState: DexyGoldBankFreeInputs
): EIP12UnsignedTransaction {
	const { T_free, T_buffer_5: T_buffer } = DEXY_GOLD;
	const {
		value: freeMintXIn,
		freeMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankFreeMintBox(freeState.freeMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(freeState.bankIn);
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(freeState.buybankIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);
	const dataInputs = [freeState.goldOracle, freeState.lpIn];

	const buybackBoxIn = new ErgoUnsignedInput(freeState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const {
		amountErg,
		amountDexy,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount,
		bankDexy,
		bankErgsAdded,
		buybackErgsAdded
	} = dexyGoldBankFreeInputDexyPrice(inputDexy, feeMining, freeState);

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - amountDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;
	const freeMintXOut = freeMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		maxAvailableAmount,
		amountDexy,
		maxAllowedIfReset,
		T_free,
		T_buffer
	);

	const bankOut = new OutputBuilder(bankXOut, DEXY_GOLD.bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(freeMintXOut, DEXY_GOLD.freeMintErgoTree)
		.addTokens([{ tokenId: freeMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, DEXY_GOLD.buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gortTokenId, amount: gortAmount }
	]);

	const swapFeeBox = new OutputBuilder(uiSwapFee, UI_FEE_ADDRESS);

	const unsignedTx = new TransactionBuilder(height)
		.from([freeState.freeMintIn, freeState.bankIn, buybackBoxIn, ...userUtxos], {
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

export function dexyGoldBankArbitrageInputDexyPrice(
	inputDexy: bigint,
	feeMining: bigint,
	arbState: DexyGoldBankArbitrageInputs
) {
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;
	const { R4ResetHeight, R5AvailableAmount } = parseBankArbitrageMintBox(arbState.arbMintIn);
	const { value: bankXIn, bankNFT, dexyAmount: bankYIn } = parseBankBox(arbState.bankIn);
	const { dexyAmount: lpYData, value: lpXData } = parseLpBox(arbState.lpIn);
	const { R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	const oracleRate = oracleRateData / 1_000_000n;
	const contractDexy = inputDexy;
	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractDexy);
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);
	const oracleRateWithFee = bankRate + buybackRate;
	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee;
	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn,
		bankErgsAdded,
		buybackErgsAdded
	};
}
export function dexyGoldBankArbitrageInputDexyTx(
	inputDexy: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	arbState: DexyGoldBankArbitrageInputs
): EIP12UnsignedTransaction {
	const { T_arb, T_buffer_5: T_buffer } = DEXY_GOLD;
	const {
		value: arbMintXIn,
		arbitrageMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(arbState.buybankIn);
	const dataInputs = [arbState.goldOracle, arbState.lpIn, arbState.tracking101];
	const buybackBoxIn = new ErgoUnsignedInput(arbState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const {
		amountErg,
		amountDexy,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount,
		bankDexy,
		bankErgsAdded,
		buybackErgsAdded
	} = dexyGoldBankArbitrageInputDexyPrice(inputDexy, feeMining, arbState);

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - amountDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;
	const arbMintXOut = arbMintXIn;
	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		amountDexy,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	const bankOut = new OutputBuilder(bankXOut, DEXY_GOLD.bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(arbMintXOut, DEXY_GOLD.arbitrageMintErgoTree)
		.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, DEXY_GOLD.buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gortTokenId, amount: gortAmount }
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

export function dexyGoldBankArbitrageInputErgPrice(
	inputErg: bigint,
	feeMining: bigint,
	arbState: DexyGoldBankArbitrageInputs
) {
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;
	const { R4ResetHeight, R5AvailableAmount } = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	const oracleRate = oracleRateData / 1_000_000n;
	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);
	const { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);
	const oracleRateWithFee = bankRate + buybackRate;
	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee;

	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn,
		bankErgsAdded,
		buybackErgsAdded
	};
}

export function dexyGoldBankArbitrageInputErgTx(
	inputErg: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	arbState: DexyGoldBankArbitrageInputs
): EIP12UnsignedTransaction {
	const { T_arb, T_buffer_5: T_buffer } = DEXY_GOLD;
	const {
		value: arbMintXIn,
		arbitrageMintNFT,
		R4ResetHeight,
		R5AvailableAmount
	} = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(arbState.buybankIn);
	const { dexyAmount: lpYData, value: lpXData } = parseLpBox(arbState.lpIn);
	const dataInputs = [arbState.goldOracle, arbState.lpIn, arbState.tracking101];

	const buybackBoxIn = new ErgoUnsignedInput(arbState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	const userUtxos = utxos;
	const userAddress = userBase58PK;
	const userChangeAddress = userAddress;

	const {
		amountErg,
		amountDexy,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount,
		bankDexy,
		bankErgsAdded,
		buybackErgsAdded
	} = dexyGoldBankArbitrageInputErgPrice(inputErg, feeMining, arbState);

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - amountDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;
	const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		amountDexy,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	const bankOut = new OutputBuilder(bankXOut, DEXY_GOLD.bankErgoTree).addTokens([
		{ tokenId: bankNFT, amount: 1n },
		{ tokenId: dexyTokenId, amount: bankYOut }
	]);

	const arbMintOut = new OutputBuilder(arbMintXOut, DEXY_GOLD.arbitrageMintErgoTree)
		.addTokens([{ tokenId: arbitrageMintNFT, amount: 1n }])
		.setAdditionalRegisters({
			R4: SInt(Number(resetHeightOut)).toHex(),
			R5: SLong(BigInt(remainingDexyOut)).toHex()
		});

	const buybackOut = new OutputBuilder(buybackXOut, DEXY_GOLD.buybackErgoTree).addTokens([
		{ tokenId: buybackNFT, amount: 1n },
		{ tokenId: gortTokenId, amount: gortAmount }
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

// ui
//prettier-ignore
export function buildSwapDexyGoldTx(fromAssets:any,toAssets:any,input:bigint,  me:string, height:number, feeMining:bigint, utxos:NodeBox[], dexyGoldUtxo: DexyGoldUtxo, dexyGoldNumbers: DexyGoldNumbers){
		
		let from = fromAssets[1].token? fromAssets[0].token + '+' + fromAssets[1].token : fromAssets[0].token 
		let to = toAssets[1].token? toAssets[0].token + '+' + toAssets[1].token : toAssets[0].token 
		from = fromAssets.find((o)=>o.amount) ? from +"_"+fromAssets.find((o)=>o.amount).token : from 
		to = toAssets.find((o)=>o.amount) ? to +"_"+toAssets.find((o)=>o.amount).token : to 
		let swapPairLastInput = from + '/' +to

		const amount = [...fromAssets,...toAssets].find((o)=>o.amount).amount

		console.log('swapPairLastInputTest:', swapPairLastInput)

		//let swapPairLastInput = `${fromAssets[0].token}/${toAsset.token}_${lastInput == 'From' ? fromAsset.token : toAsset.token}`;
		//const amount = lastInput == 'From' ? fromAsset.amount : toAsset.amount;
		//console.log('',fromAssets[0].isLpToken)
		let unsignedTx;
		let bankArbBetterThanLp,bankFreeBetterThanLp
		switch (swapPairLastInput.toUpperCase()) {
			case 'ERG+DEXYGOLD_ERG/DEXYLP':  	unsignedTx = dexyGoldLpMintInputErgTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'ERG+DEXYGOLD_DEXYGOLD/DEXYLP':unsignedTx = dexyGoldLpMintInputDexyTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'ERG+DEXYGOLD_DEXYLP_DEXYLP':	unsignedTx = dexyGoldLpMintInputSharesTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'DEXYLP_DEXYLP/ERG+DEXYGOLD':	unsignedTx = dexyGoldLpRedeemInputSharesTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'DEXYLP/ERG+DEXYGOLD_ERG': 	unsignedTx = dexyGoldLpRedeemInputErgTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'DEXYLP/ERG+DEXYGOLD_DEXYGOLD':unsignedTx = dexyGoldLpRedeemInputDexyTx(amount, me, height, feeMining, utxos, dexyGoldUtxo); break;

			case 'ERG_ERG/DEXYGOLD': 			unsignedTx = dexyGoldBestBuyDexyGoldInputErgTx(amount, me, height, feeMining, utxos, dexyGoldUtxo,dexyGoldNumbers); break;			
			case 'ERG/DEXYGOLD_DEXYGOLD': 		unsignedTx = dexyGoldBestBuyDexyGoldInputDexyTx(amount, me, height, feeMining, utxos, dexyGoldUtxo,dexyGoldNumbers); break;
			case 'DEXYGOLD_DEXYGOLD/ERG':		unsignedTx = dexyGoldLpSwapInputDexyTx(amount,DIRECTION_BUY, me, height, feeMining, utxos, dexyGoldUtxo); break;
			case 'DEXYGOLD/ERG_ERG':			unsignedTx = dexyGoldLpSwapInputErgTx(amount,DIRECTION_BUY,me, height, feeMining, utxos, dexyGoldUtxo); break;
			default:
				throw new Error(`Unsupported swapPair and lastInput combination: ${swapPairLastInput}`);
		}
		return unsignedTx;
	}

function dexyGoldBestBuyDexyGoldInputErgTx(
	amount: bigint,
	me: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers
) {
	let unsignedTx;
	const { bankArbBetterThanLp, bankFreeBetterThanLp } = bestOptionErgToDexyGoldInputErg(
		amount,
		dexyGoldUtxo,
		dexyGoldNumbers,
		feeMining
	);

	if (bankArbBetterThanLp) {
		unsignedTx = dexyGoldBankArbitrageInputErgTx(
			amount,
			me,
			height,
			feeMining,
			utxos,
			dexyGoldUtxo
		);
	} else if (bankFreeBetterThanLp) {
		unsignedTx = dexyGoldBankFreeInputErgTx(amount, me, height, feeMining, utxos, dexyGoldUtxo);
	} else {
		unsignedTx = dexyGoldLpSwapInputErgTx(
			amount,
			DIRECTION_SELL,
			me,
			height,
			feeMining,
			utxos,
			dexyGoldUtxo
		);
	}
	return unsignedTx;
}

function dexyGoldBestBuyDexyGoldInputDexyTx(
	amount: bigint,
	me: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers
) {
	let unsignedTx;
	const { bankArbBetterThanLp, bankFreeBetterThanLp } = bestOptionErgToDexyGoldInputDexy(
		amount,
		dexyGoldUtxo,
		dexyGoldNumbers,
		feeMining
	);

	if (bankArbBetterThanLp) {
		unsignedTx = dexyGoldBankArbitrageInputDexyTx(
			amount,
			me,
			height,
			feeMining,
			utxos,
			dexyGoldUtxo
		);
	} else if (bankFreeBetterThanLp) {
		unsignedTx = dexyGoldBankFreeInputDexyTx(amount, me, height, feeMining, utxos, dexyGoldUtxo);
	} else {
		unsignedTx = dexyGoldLpSwapInputDexyTx(
			amount,
			DIRECTION_SELL,
			me,
			height,
			feeMining,
			utxos,
			dexyGoldUtxo
		);
	}
	return unsignedTx;
}
export function bestOptionErgToDexyGoldInputErg(
	nanoErgAmount: bigint,
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers,
	feeMining: bigint
): ErgToDexyGoldOptions {
	const {
		amountErg,
		amountDexy: lpSwapAmount,
		price: lpSwapPrice
	} = dexyGoldLpSwapInputErgPrice(nanoErgAmount, DIRECTION_SELL, feeMining, dexyGoldUtxo);
	const oracleWithFees = dexyGoldNumbers.oracleRateWithBankAndUiFees;
	const userApproxDexyRequest = nanoErgAmount / oracleWithFees;

	const bankFreeAmountAvailable = dexyGoldNumbers.bankFreeMintAvailableDexy;
	const bankArbAmountAvailable = dexyGoldNumbers.bankArbMintAvailableDexy;

	let bankArbPrice, bankArbAmount, bankArbBetterThanLp;
	let bankFreePrice, bankFreeAmount, bankFreeBetterThanLp;

	if (
		dexyGoldNumbers.isBankArbMintActive &&
		lpSwapPrice > oracleWithFees &&
		bankArbAmountAvailable >= userApproxDexyRequest
	) {
		({ amountDexy: bankArbAmount, price: bankArbPrice } = dexyGoldBankArbitrageInputErgPrice(
			nanoErgAmount,
			feeMining,
			dexyGoldUtxo
		));
		bankArbBetterThanLp = true;
	}
	if (
		dexyGoldNumbers.isBankFreeMintActive &&
		lpSwapPrice > oracleWithFees &&
		bankFreeAmountAvailable >= userApproxDexyRequest
	) {
		({ amountDexy: bankFreeAmount, price: bankFreePrice } = dexyGoldBankFreeInputErgPrice(
			nanoErgAmount,
			feeMining,
			dexyGoldUtxo
		));
		bankFreeBetterThanLp = true;
	}

	let bestAmount = bankArbBetterThanLp
		? bankArbAmount
		: bankFreeBetterThanLp
			? bankFreeAmount
			: lpSwapAmount;
	let bestPrice = bankArbBetterThanLp
		? bankArbPrice
		: bankFreeBetterThanLp
			? bankFreePrice
			: lpSwapPrice;

	return {
		lpSwapPrice,
		lpSwapAmount,

		bankArbBetterThanLp,
		bankArbPrice,
		bankArbAmount,

		bankFreeBetterThanLp,
		bankFreePrice,
		bankFreeAmount,

		bestAmount,
		bestPrice
	};
}
export function bestOptionErgToDexyGoldInputDexy(
	userDexyRequest: bigint,
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers,
	feeMining: bigint
): ErgToDexyGoldOptions {
	const {
		amountErg: lpSwapAmount,
		amountDexy,
		price: lpSwapPrice
	} = dexyGoldLpSwapInputDexyPrice(
		userDexyRequest,
		DIRECTION_SELL, //
		feeMining,
		dexyGoldUtxo
	);

	const oracleWithFees = dexyGoldNumbers.oracleRateWithBankAndUiFees;
	const bankFreeAmountAvailable = dexyGoldNumbers.bankFreeMintAvailableDexy;
	const bankArbAmountAvailable = dexyGoldNumbers.bankArbMintAvailableDexy;

	let bankArbPrice, bankArbAmount, bankArbBetterThanLp;
	let bankFreePrice, bankFreeAmount, bankFreeBetterThanLp;

	if (
		dexyGoldNumbers.isBankArbMintActive &&
		lpSwapPrice > oracleWithFees &&
		bankArbAmountAvailable >= userDexyRequest
	) {
		({ amountErg: bankArbAmount, price: bankArbPrice } = dexyGoldBankArbitrageInputDexyPrice(
			userDexyRequest,
			feeMining,
			dexyGoldUtxo
		));
		bankArbBetterThanLp = true;
	}

	if (
		dexyGoldNumbers.isBankFreeMintActive &&
		lpSwapPrice > oracleWithFees &&
		bankFreeAmountAvailable >= userDexyRequest
	) {
		({ amountErg: bankFreeAmount, price: bankFreePrice } = dexyGoldBankFreeInputDexyPrice(
			userDexyRequest,
			feeMining,
			dexyGoldUtxo
		));
		bankFreeBetterThanLp = true;
		//Use Function To Calculate Price and Amount
	}
	let bestAmount = bankArbBetterThanLp
		? bankArbAmount
		: bankFreeBetterThanLp
			? bankFreeAmount
			: lpSwapAmount;
	let bestPrice = bankArbBetterThanLp
		? bankArbPrice
		: bankFreeBetterThanLp
			? bankFreePrice
			: lpSwapPrice;
	return {
		lpSwapPrice,
		lpSwapAmount,

		bankArbBetterThanLp,
		bankArbPrice,
		bankArbAmount,

		bankFreeBetterThanLp,
		bankFreePrice,
		bankFreeAmount,

		bestAmount,
		bestPrice
	};
}
export function bestOptionErgToDexyGold(
	lastInput: string,
	fromAmount: bigint,
	toAmount: bigint,
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers,
	feeMining: bigint
): ErgToDexyGoldBestOption {
	const {
		lpSwapPrice,
		lpSwapAmount,

		bankArbBetterThanLp,
		bankArbPrice,
		bankArbAmount,

		bankFreeBetterThanLp,
		bankFreePrice,
		bankFreeAmount
	} =
		lastInput === 'From'
			? bestOptionErgToDexyGoldInputErg(fromAmount, dexyGoldUtxo, dexyGoldNumbers, feeMining)
			: bestOptionErgToDexyGoldInputDexy(toAmount, dexyGoldUtxo, dexyGoldNumbers, feeMining);

	let bestAmount = bankArbBetterThanLp
		? bankArbAmount
		: bankFreeBetterThanLp
			? bankFreeAmount
			: lpSwapAmount;
	let bestPrice = bankArbBetterThanLp
		? bankArbPrice
		: bankFreeBetterThanLp
			? bankFreePrice
			: lpSwapPrice;

	bankArbBetterThanLp
		? console.log('LP BANK Arb:  Erg:', bankArbAmount, ' Price:', bankArbPrice)
		: '';
	bankFreeBetterThanLp
		? console.log('LP BANK Free: Erg:', bankFreeAmount, ' Price:', bankFreePrice)
		: '';
	console.log('LP SWAP: 	   Erg:', lpSwapAmount, ' Price:', lpSwapPrice);
	console.log('');

	return { bestAmount, bestPrice }; // { bestAmount, bestPrice , bankArbBetterThanLp , bankFreeBetterThanLp};
}

export function doRecalcDexyGoldContract(
	anchor: SwapItem,
	swapIntent: SwapIntention,
	dexyGoldUtxo: DexyGoldUtxo,
	dexyGoldNumbers: DexyGoldNumbers,
	feeMining: bigint
): SwapPreview {
	const swapTag = getSwapTag(swapIntent, anchor);
	const amount = anchor.amount!;

	let calculatedIntent = structuredClone(swapIntent);
	let swapPreview: SwapPreview;

	if (swapTag == 'ERG+DEXYGOLD_ERG/DEXYGOLDLP') {
		const { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price } =
			dexyGoldLpMintInputErgPrice(amount, feeMining, dexyGoldUtxo);
		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
		setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}

	if (swapTag == 'ERG+DEXYGOLD_DEXYGOLD/DEXYGOLDLP') {
		const { uiSwapFee, inputErg, contractDexy, contractErg, sharesUnlocked, price } =
			dexyGoldLpMintInputDexyPrice(amount, feeMining, dexyGoldUtxo);

		setAmount(calculatedIntent, ERGO_TOKEN_ID, contractErg);
		setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'ERG+DEXYGOLD/DEXYGOLDLP_DEXYGOLDLP') {
		const { uiSwapFee, inputErg, contractErg, contractDexy, sharesUnlocked, price } =
			dexyGoldLpMintInputSharesPrice(amount, feeMining, dexyGoldUtxo);

		setAmount(calculatedIntent, ERGO_TOKEN_ID, inputErg);
		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'DEXYGOLDLP_DEXYGOLDLP/ERG+DEXYGOLD') {
		const { uiSwapFee, userErg, contractErg, contractDexy, price } =
			dexyGoldLpRedeemInputSharesPrice(amount, feeMining, dexyGoldUtxo);

		setAmount(calculatedIntent, ERGO_TOKEN_ID, userErg);
		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}

	if (swapTag == 'DEXYGOLDLP/ERG+DEXYGOLD_ERG') {
		const { uiSwapFee, contractErg, contractDexy, sharesUnlocked, price } =
			dexyGoldLpRedeemInputErgPrice(amount, feeMining, dexyGoldUtxo);

		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
		setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'DEXYGOLDLP/ERG+DEXYGOLD_DEXYGOLD') {
		const { uiSwapFee, userErg, contractErg, sharesUnlocked, price } =
			dexyGoldLpRedeemInputDexyPrice(amount, feeMining, dexyGoldUtxo);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, userErg);
		setAmount(calculatedIntent, DEXY_GOLD.lpTokenId, sharesUnlocked);

		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	//
	if (swapTag == 'ERG_ERG/DEXYGOLD') {
		const { bestAmount: contractDexy, bestPrice: price } = bestOptionErgToDexyGoldInputErg(
			amount,
			dexyGoldUtxo,
			dexyGoldNumbers,
			feeMining
		);
		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, contractDexy);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'ERG/DEXYGOLD_DEXYGOLD') {
		const { bestAmount: inputErg, bestPrice: price } = bestOptionErgToDexyGoldInputDexy(
			amount,
			dexyGoldUtxo,
			dexyGoldNumbers,
			feeMining
		);
		setAmount(calculatedIntent, ERGO_TOKEN_ID, inputErg);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'DEXYGOLD_DEXYGOLD/ERG') {
		const { amountErg, amountDexy, price } = dexyGoldLpSwapInputDexyPrice(
			amount,
			DIRECTION_BUY,
			feeMining,
			dexyGoldUtxo
		);

		setAmount(calculatedIntent, ERGO_TOKEN_ID, amountErg);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}
	if (swapTag == 'DEXYGOLD/ERG_ERG') {
		const { amountErg, amountDexy, price } = dexyGoldLpSwapInputErgPrice(
			amount,
			DIRECTION_BUY, //
			feeMining,
			dexyGoldUtxo
		);
		setAmount(calculatedIntent, DEXY_GOLD.dexyTokenId, amountDexy);
		swapPreview = { calculatedIntent, price };
		console.log({ swapPreview });
	}

	// @ts-ignore
	return swapPreview;
}
