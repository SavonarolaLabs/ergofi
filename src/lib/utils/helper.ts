import type { Amount, Box, TokenAmount } from '@fleet-sdk/common';
import { ErgoAddress, Network } from '@fleet-sdk/core';

const network = Network.Mainnet;

export function addressFromPk(pk: string) {
	return ErgoAddress.fromPublicKey(pk, network).toString();
}

export function ergoTree(address: string): string {
	return ErgoAddress.fromBase58(address).ergoTree;
}

export function arraysEqual(a, b) {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function asBigInt(v: bigint | string | number) {
	if (typeof v == 'bigint') {
		return v;
	} else if (typeof v == 'string') {
		try {
			return BigInt(v);
		} catch (e) {
			console.error('asBigInt' + v);
			return 0n;
		}
	} else if (typeof v == 'number') {
		return BigInt(v);
	}
	return 0n;
}

export function sumNanoErg(boxes: Box[]): bigint {
	console.log(boxes);
	return boxes.reduce((a: bigint, b: Box<Amount>) => asBigInt(a) + asBigInt(b.value), 0n);
}

export function calcTokenChange(
	utxosIn: Box[],
	tokensOut: TokenAmount<Amount>[]
): TokenAmount<Amount>[] {
	let inputCopy: Box[] = JSON.parse(JSON.stringify(utxosIn));
	const inputTokens = inputCopy.flatMap((box) => box.assets).reduce(sumAssets, []);
	return _subtractAssets(inputTokens, tokensOut);
}

export function sumAssetsFromBoxes(boxes: Box[]) {
	return boxes.flatMap((box) => box.assets).reduce(sumAssets, []);
}

export function amountByTokenId(boxes: Box[], tokenId: string): Amount {
	return sumAssetsFromBoxes(boxes).find((t) => t.tokenId == tokenId)?.amount ?? 0n;
}

export function sumAssets(acc: TokenAmount<Amount>[], asset: TokenAmount<Amount>) {
	const token = acc.find((t) => t.tokenId == asset.tokenId);
	if (token) {
		token.amount = asBigInt(token.amount) + asBigInt(asset.amount);
	} else {
		acc.push(asset);
	}
	return acc;
}
function _subtractAssets(a: TokenAmount<Amount>[], b: TokenAmount<Amount>[]) {
	b.forEach((bToken) => {
		const aToken = a.find((token) => token.tokenId == bToken.tokenId);
		if (aToken) {
			aToken.amount = asBigInt(aToken.amount) - asBigInt(bToken.amount);
		}
	});
	return a.filter((token) => asBigInt(token.amount) > 0n);
}
