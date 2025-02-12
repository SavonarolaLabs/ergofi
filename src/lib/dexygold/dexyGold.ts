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

export type DexyGoldState =
	| DexyGoldBankFreeInputs
	| DexyGoldBankArbitrageInputs
	| DexyGoldLpSwapInputs
	| DexyGoldLpMintInputs
	| DexyGoldLpRedeemInputs;

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

	// if (direction == DIRECTION_SELL) {
	// 	console.log('we are here');
	// 	amountErg = BigInt(
	// 		Math.floor(Number((amountDexy + 1n) * feeDenomLp) / (rate * Number(feeNumLp)))
	// 	); //- 100n; //- 1n; //Rounded but need to check -1n <==
	// } else {
	// 	//
	// 	amountErg = BigInt(
	// 		Math.ceil((Number(amountDexy) * Number(feeNumLp)) / (Number(feeDenomLp) * rate))
	// 	); //+100n; //Rounded but need to check +1n <==
	// }

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
	console.log('-----INPUT DEXY-----');
	console.log(inputDexy, 'inputDexy');
	console.log(contractERG, 'contractERG');
	console.log(amountErg, 'amountErg');
	console.log('-----INPUT DEXY-----');
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
	const { uiSwapFee, contractErg, dexyInput, sharesUnlocked } = dexyGoldLpRedeemInputErgPrice(
		inputErg,
		feeMining,
		redeemState
	);

	const lpRedeemOutValue = lpRedeemInValue;
	const lpXOut = lpXIn - contractErg;
	const lpYOut = lpYIn - dexyInput;
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

export function dexyGoldBankFreeInputErgTx(
	inputErg: bigint,
	userBase58PK: string,
	height: number,
	feeMining: bigint,
	utxos: NodeBox[],
	freeState: DexyGoldBankFreeInputs
): EIP12UnsignedTransaction {
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
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(freeState.buybankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(freeState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);

	const dataInputs = [freeState.goldOracle, freeState.lpIn];
	const userUtxos = utxos; //<== rename

	const userAddress = userBase58PK; //<== rename
	const userChangeAddress = userAddress; //<== delete after

	let buybackBoxIn = new ErgoUnsignedInput(freeState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	//--------------- Calculations -------------

	//data process:
	const lpRate = lpXData / lpYData; //<===
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);

	const { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);

	const oracleRateWithFee = bankRate + buybackRate;

	const maxAllowedIfReset = lpYData / 100n; //free

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - contractDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	const freeMintXOut = freeMintXIn;
	//const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		contractDexy,
		maxAllowedIfReset,
		T_free,
		T_buffer
	);

	//------------------------------
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

	//data process:
	const oracleRate = oracleRateData / 1_000_000n;

	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);

	const { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);

	const maxAllowedIfReset = lpYData / 100n; //free

	console.log('-----INPUT ERG-----');
	console.log(inputErg, 'inputErg');
	console.log(contractErg, 'contractErg');
	console.log(contractDexy, 'contractDexy');
	console.log('-----INPUT ERG-----');

	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn
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
	const {
		value: buybackXIn,
		buybackNFT,
		gortAmount,
		gortTokenId
	} = parseBuybackBox(freeState.buybankIn);
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(freeState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(freeState.goldOracle);

	const dataInputs = [freeState.goldOracle, freeState.lpIn];
	const userUtxos = utxos; //<== rename

	const userAddress = userBase58PK; //<== rename
	const userChangeAddress = userAddress; //<== delete after

	let buybackBoxIn = new ErgoUnsignedInput(freeState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	//--------------- Calculations -------------

	//data process:
	const lpRate = lpXData / lpYData; //<===
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const contractDexy = inputDexy; //<===

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractDexy);
	const oracleRateWithFee = bankRate + buybackRate;

	// FEE  ------------------------------
	//Part 0 - use Fee Reversed
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const maxAllowedIfReset = lpYData / 100n;

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - contractDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	const freeMintXOut = freeMintXIn;
	//const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		contractDexy,
		maxAllowedIfReset,
		T_free,
		T_buffer
	);

	//------------------------------
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

	//data process:
	const oracleRate = oracleRateData / 1_000_000n;

	const contractDexy = inputDexy; //<===

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractDexy);

	// FEE  ------------------------------
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const maxAllowedIfReset = lpYData / 100n;

	console.log('-----INPUT ERG-----');
	console.log(inputErg, 'inputErg');
	console.log(contractErg, 'contractErg');
	console.log(contractDexy, 'contractDexy');
	console.log('-----INPUT ERG-----');

	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn
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
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;

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

	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

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

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, dexyContract);
	const oracleRateWithFee = bankRate + buybackRate;

	// FEE  ------------------------------
	//Part 0 - use Fee Reversed
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
	//maxAllowedIfReset = lpYData / 100n; //free

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - dexyContract;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	//freeMintXOut = freeMintXIn;
	const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		dexyContract,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	//------------------------------
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
export function dexyGoldBankArbitrageInputDexyPrice(
	inputDexy: bigint,
	feeMining: bigint,
	arbState: DexyGoldBankArbitrageInputs
) {
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;

	const { R5AvailableAmount } = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);

	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	//data process:
	const oracleRate = oracleRateData / 1_000_000n;

	const contractDexy = inputDexy;

	const { contractErg, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputDexy(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractDexy);

	const oracleRateWithFee = bankRate + buybackRate;

	// FEE  ------------------------------
	//Part 0 - use Fee Reversed
	const { inputErg, uiSwapFee } = reverseFee(contractErg, feeMining);

	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb

	console.log('-----INPUT ERG-----');
	console.log(inputErg, 'inputErg');
	console.log(contractErg, 'contractErg');
	console.log(contractDexy, 'contractDexy');
	console.log('-----INPUT ERG-----');

	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn
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
	const { T_arb, T_buffer_5: T_buffer, bankFeeNum, buybackFeeNum, feeDenom } = DEXY_GOLD;

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
	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	const dataInputs = [arbState.goldOracle, arbState.lpIn, arbState.tracking101];
	const userUtxos = utxos; //<== rename

	const userAddress = userBase58PK; //<== rename
	const userChangeAddress = userAddress; //<== delete after

	let buybackBoxIn = new ErgoUnsignedInput(arbState.buybankIn);
	buybackBoxIn.setContextExtension({ 0: SInt(1).toHex() });

	//data process:
	const lpRate = lpXData / lpYData; //<===
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);

	const { contractDexy, bankErgsAdded, buybackErgsAdded, bankRate, buybackRate } =
		calculateBankMintInputErg(oracleRate, 1n, bankFeeNum, buybackFeeNum, feeDenom, contractErg);

	const oracleRateWithFee = bankRate + buybackRate;

	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb
	//maxAllowedIfReset = lpYData / 100n; //free

	const bankXOut = bankXIn + bankErgsAdded;
	const bankYOut = bankYIn - contractDexy;
	const buybackXOut = buybackXIn + buybackErgsAdded;

	//freeMintXOut = freeMintXIn;
	const arbMintXOut = arbMintXIn;

	const { resetHeightOut, remainingDexyOut } = calculateResetAndAmountMint(
		height,
		R4ResetHeight,
		R5AvailableAmount,
		contractDexy,
		maxAllowedIfReset,
		T_arb,
		T_buffer
	);

	//------------------------------
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

	const { R5AvailableAmount } = parseBankArbitrageMintBox(arbState.arbMintIn);
	const {
		value: bankXIn,
		bankNFT,
		dexyAmount: bankYIn,
		dexyTokenId
	} = parseBankBox(arbState.bankIn);

	const { dexyAmount: lpYData, value: lpXData, lpTokenAmount } = parseLpBox(arbState.lpIn);
	const { oraclePoolNFT, R4Rate: oracleRateData } = parseDexyGoldOracleBox(arbState.goldOracle);

	//data process:
	const oracleRate = oracleRateData / 1_000_000n;

	// FEE ------------------------------
	const { contractErg, uiSwapFee } = applyFee(inputErg, feeMining);

	const { contractDexy, bankRate, buybackRate } = calculateBankMintInputErg(
		oracleRate,
		1n,
		bankFeeNum,
		buybackFeeNum,
		feeDenom,
		contractErg
	);

	const oracleRateWithFee = bankRate + buybackRate;

	const maxAllowedIfReset = (lpXData - oracleRateWithFee * lpYData) / oracleRateWithFee; //arb

	console.log('-----INPUT ERG-----');
	console.log(inputErg, 'inputErg');
	console.log(contractErg, 'contractErg');
	console.log(contractDexy, 'contractDexy');
	console.log('-----INPUT ERG-----');

	const price = Number(inputErg) / Number(contractDexy);

	return {
		amountErg: inputErg,
		amountDexy: contractDexy,
		price,
		uiSwapFee,
		contractErg,
		maxAllowedIfReset,
		maxAvailableAmount: R5AvailableAmount,
		bankDexy: bankYIn
	};
}

// ui
//prettier-ignore
export function buildSwapDexyGoldTx(fromAssets:any,toAssets:any,input:bigint,  me:string, height:number, feeMining:bigint, utxos:NodeBox[], state: DexyGoldState){
		
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
		switch (swapPairLastInput.toUpperCase()) {
			case 'ERG+DEXYGOLD_ERG/DEXYLP':  	unsignedTx = dexyGoldLpMintInputErgTx(amount, me, height, feeMining, utxos, state); break;
			case 'ERG+DEXYGOLD_DEXYGOLD/DEXYLP':unsignedTx = dexyGoldLpMintInputDexyTx(amount, me, height, feeMining, utxos, state); break;
			case 'ERG+DEXYGOLD_DEXYLP_DEXYLP':	unsignedTx = dexyGoldLpMintInputSharesTx(amount, me, height, feeMining, utxos, state); break;
			case 'DEXYLP_DEXYLP/ERG+DEXYGOLD':	unsignedTx = dexyGoldLpRedeemInputSharesTx(amount, me, height, feeMining, utxos, state); break;
			case 'DEXYLP/ERG+DEXYGOLD_ERG': 	unsignedTx = dexyGoldLpRedeemInputErgTx(amount, me, height, feeMining, utxos, state); break;
			case 'DEXYLP/ERG+DEXYGOLD_DEXYGOLD':unsignedTx = dexyGoldLpRedeemInputDexyTx(amount, me, height, feeMining, utxos, state); break;

			case 'ERG_ERG/DEXYGOLD': 			unsignedTx = dexyGoldLpSwapInputErgTx(amount,DIRECTION_SELL, me, height, feeMining, utxos, state); break;
			case 'ERG/DEXYGOLD_DEXYGOLD': 		unsignedTx = dexyGoldLpSwapInputDexyTx(amount,DIRECTION_SELL, me, height, feeMining, utxos, state); break;
			case 'DEXYGOLD_DEXYGOLD/ERG':		unsignedTx = dexyGoldLpSwapInputDexyTx(amount,DIRECTION_BUY, me, height, feeMining, utxos, state); break;
			case 'DEXYGOLD/ERG_ERG':			unsignedTx = dexyGoldLpSwapInputErgTx(amount,DIRECTION_BUY,me, height, feeMining, utxos, state); break;
			default:
				throw new Error(`Unsupported swapPair and lastInput combination: ${swapPairLastInput}`);
		}
		return unsignedTx;
	}
