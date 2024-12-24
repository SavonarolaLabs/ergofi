import { TOKEN_SIGRSV, TOKEN_SIGUSD } from './api/ergoNode';

export function calculateTokenStatsByErgoTree(
	tx: any,
	tokenId: string,
	ergoTree: string
): TokenStats {
	const inputAmount = tx.inputs
		.filter((input: any) => input.ergoTree === ergoTree)
		.flatMap((input: any) => input.assets)
		.filter((asset: any) => asset.tokenId === tokenId)
		.reduce((sum: number, asset: any) => sum + asset.amount, 0);

	const outputAmount = tx.outputs
		.filter((output: any) => output.ergoTree === ergoTree)
		.flatMap((output: any) => output.assets)
		.filter((asset: any) => asset.tokenId === tokenId)
		.reduce((sum: number, asset: any) => sum + asset.amount, 0);

	return {
		input: inputAmount,
		output: outputAmount,
		difference: outputAmount - inputAmount
	};
}

export function calculateAddressInfo(tx: any, ergoTree: string): AddressInfo {
	return {
		ergoTree: ergoTree,
		ergoStats: calculateErgoStatsByErgoTree(tx, ergoTree),
		usdStats: calculateTokenStatsByErgoTree(tx, TOKEN_SIGUSD, ergoTree),
		rsvStats: calculateTokenStatsByErgoTree(tx, TOKEN_SIGRSV, ergoTree)
	};
}

export function returnOutputsExcept(
	tx: any,
	includeTrees?: string[], // Опционально
	exceptTrees?: string[] // Опционально
) {
	if (!tx?.outputs) {
		return [];
	}

	return tx.outputs.filter((o) => {
		const isInIncludeTrees = includeTrees ? includeTrees.includes(o.ergoTree) : true; // Если includeTrees не указан, включаем все
		const isInExceptTrees = exceptTrees ? exceptTrees.includes(o.ergoTree) : false; // Если exceptTrees не указан, ничего не исключаем
		return isInIncludeTrees && !isInExceptTrees; // Включаем, если входит в include и не входит в except
	});
}

export function calculateOperationInfo(bank: AddressInfo, user: AddressInfo): OperationInfo {
	let priceErgUsd;
	let priceErgSigRSV;
	let pair;
	let operation;
	let amount;
	let volume;
	let price;

	if (bank.usdStats?.difference !== 0) {
		pair = 'USD/ERG';
		operation = bank.usdStats!.difference! < 0 ? 'buy' : 'sell';
		amount = -centsToUsd(bank.usdStats!.difference!) + ' USD';
		priceErgUsd = (-(bank.usdStats!.difference! / bank.ergoStats!.difference!) * 10 ** 7).toFixed(
			2
		);
		priceErgSigRSV = 0;
		price = (-(user.usdStats!.difference! / user.ergoStats!.difference!) * 10 ** 7).toFixed(2);
	} else {
		pair = 'RSV/ERG';
		operation = bank.rsvStats!.difference! < 0 ? 'buy' : 'sell';
		amount = -bank.rsvStats!.difference! + ' RSV';
		priceErgSigRSV = (
			-(bank.rsvStats!.difference! / bank.ergoStats!.difference!) *
			10 ** 9
		).toFixed(2);
		priceErgUsd = 0;
		price = (-(user.rsvStats!.difference! / user.ergoStats!.difference!) * 10 ** 9).toFixed(2);
	}
	volume = -nanoErgToErg(bank.ergoStats!.difference!) + ' ERG';

	return {
		pair: pair,
		operation: operation,
		amount: amount,
		volume: volume,
		priceContract: pair == 'USD/ERG' ? priceErgUsd : priceErgSigRSV,
		price
	};
}

export function nanoErgToErg(nanoErg: number) {
	return nanoErg ? Number((nanoErg / 10 ** 9).toFixed(2)) : 0;
}

export function centsToUsd(cents: number) {
	return cents ? Number((cents / 10 ** 2).toFixed(2)) : 0;
}

export function calculateErgoStatsByErgoTree(tx: any, address: string): TokenStats {
	const inputAmount = tx.inputs
		.filter((input: any) => input.ergoTree === address)
		.reduce((sum: number, input: any) => sum + input.value, 0);

	const outputAmount = tx.outputs
		.filter((output: any) => output.ergoTree === address)
		.reduce((sum: number, output: any) => sum + output.value, 0);

	return {
		input: inputAmount,
		output: outputAmount,
		difference: outputAmount - inputAmount
	};
}

export function shorten(value: string | undefined): string {
	if (!value) return '';
	return value.length > 6 ? `${value.slice(0, 3)}...${value.slice(-3)}` : value;
}

export interface TokenStats {
	input: number;
	output: number;
	difference: number;
}

export interface AddressInfo {
	ergoTree: string;
	ergoStats?: TokenStats;
	usdStats?: TokenStats;
	rsvStats?: TokenStats;
}

export interface OperationInfo {
	pair: string;
	operation: string;
	amount: string;
	volume: string;
	priceContract: string | number;
	price: string | number;
}
