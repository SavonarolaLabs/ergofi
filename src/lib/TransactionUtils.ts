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

export function returnOutputsExcept(tx: any, includeTrees?: string[], exceptTrees?: string[]) {
	if (!tx?.outputs) {
		return [];
	}

	return tx.outputs.filter((o) => {
		const isInIncludeTrees = includeTrees ? includeTrees.includes(o.ergoTree) : true; // Если includeTrees не указан, включаем все
		const isInExceptTrees = exceptTrees ? exceptTrees.includes(o.ergoTree) : false; // Если exceptTrees не указан, ничего не исключаем
		return isInIncludeTrees && !isInExceptTrees; // Включаем, если входит в include и не входит в except
	});
}
export function returnInputsExcept(tx: any, includeTrees?: string[], exceptTrees?: string[]) {
	if (!tx?.inputs) {
		return [];
	}

	return tx.inputs.filter((i) => {
		const isInIncludeTrees = includeTrees ? includeTrees.includes(i.ergoTree) : true; // Если includeTrees не указан, включаем все
		const isInExceptTrees = exceptTrees ? exceptTrees.includes(i.ergoTree) : false; // Если exceptTrees не указан, ничего не исключаем
		return isInIncludeTrees && !isInExceptTrees; // Включаем, если входит в include и не входит в except
	});
}

export function calculateTokenAmount(boxes: any[], tokenId: string): bigint {
	// Инициализация суммы
	let totalAmount = 0n;

	// Проходим по всем box
	for (const box of boxes) {
		if (box.assets && Array.isArray(box.assets)) {
			// Фильтруем assets по tokenId
			for (const asset of box.assets) {
				if (asset.tokenId === tokenId) {
					// Суммируем количество
					totalAmount += BigInt(asset.amount || 0);
				}
			}
		}
	}
	return totalAmount;
}

export function calculateErgoAmount(boxes: any[]): bigint {
	// Инициализация суммы для ERG
	let totalErgo = 0n;

	// Проходим по всем box
	for (const box of boxes) {
		// Проверяем наличие значения ERG в текущем box
		if (box.value) {
			// Добавляем значение ERG
			totalErgo += BigInt(box.value || 0);
		}
	}

	return totalErgo;
}

export function getErgoTreesByType(tx: any): {
	inputsErgoTrees: string[];
	outputsErgoTrees: string[];
} {
	// Множества для хранения уникальных значений
	const inputsErgoTrees = new Set<string>();
	const outputsErgoTrees = new Set<string>();

	// Обрабатываем inputs
	if (tx.inputs && Array.isArray(tx.inputs)) {
		for (const input of tx.inputs) {
			if (input.ergoTree) {
				inputsErgoTrees.add(input.ergoTree);
			}
		}
	}

	// Обрабатываем outputs
	if (tx.outputs && Array.isArray(tx.outputs)) {
		for (const output of tx.outputs) {
			if (output.ergoTree) {
				outputsErgoTrees.add(output.ergoTree);
			}
		}
	}

	// Возвращаем массивы из множеств
	return {
		inputsErgoTrees: Array.from(inputsErgoTrees),
		outputsErgoTrees: Array.from(outputsErgoTrees)
	};
}

export function getOtherThanSpecifiedTrees(
	ergoTrees: string[],
	specifiedTrees: string[]
): string[] {
	// Фильтруем все деревья, которых нет в specifiedTrees
	const otherTrees = ergoTrees.filter((tree) => !specifiedTrees.includes(tree));

	// Если нет других деревьев, возвращаем пустой массив
	return otherTrees.length > 0 ? otherTrees : [];
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

export function findPotentialFeeTrees(
	otherOutputsErgoTrees: string[],
	inputsErgoTrees: string[],
	outputBoxes: any[],
	ergoDifference: number
): string[] {
	const threshold = Math.abs(ergoDifference) * 0.05; // 5% от абсолютного значения

	// Массив для хранения деревьев, которые соответствуют условиям
	const potentialFeeTrees: string[] = [];

	for (const tree of otherOutputsErgoTrees) {
		// Проверяем, есть ли дерево в inputsErgoTrees
		if (!inputsErgoTrees.includes(tree)) {
			// Находим соответствующий outputBox для этого дерева
			const outputBox = outputBoxes.find((box) => box.ergoTree === tree);
			if (
				outputBox &&
				BigInt(outputBox.value) < BigInt(threshold) && // Значение Ergo меньше порога
				(!outputBox.assets || outputBox.assets.length === 0) // В боксе нет assets
			) {
				// Добавляем дерево, если оно соответствует всем условиям
				potentialFeeTrees.push(tree);
			}
		}
	}

	return potentialFeeTrees;
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
