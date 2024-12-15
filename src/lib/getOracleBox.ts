import { ORACLE_ERG_USD_NFT, TOKEN_BANK_NFT, type Output, type OutputString } from './api/ergoNode';

function boxToStrVal(box: Output): OutputString {
	let newBox = JSON.parse(JSON.stringify(box));
	newBox.value = newBox.value.toString();

	if (newBox.assets === undefined) newBox.assets = [];
	for (let i = 0; i < newBox.assets.length; i++) {
		newBox.assets[i].amount = newBox.assets[i].amount.toString();
	}

	return newBox;
}

type ExplorerOutput = {
	boxId: string;
	transactionId: string;
	blockId: string;
	value: number;
	index: number;
	globalIndex: number;
	creationHeight: number;
	settlementHeight: number;
	ergoTree: string;
	ergoTreeConstants: string;
	ergoTreeScript: string;
	address: string;
	assets: {
		tokenId: string;
		index: number;
		amount: number;
		name: string;
		decimals: number;
		type: string;
	}[];
	additionalRegisters: {
		R4: { serializedValue: string; sigmaType: string; renderedValue: string };
		R5: { serializedValue: string; sigmaType: string; renderedValue: string };
	};
	spentTransactionId: string | null;
	mainChain: boolean;
};

export type ExplorerAssetString = {
	tokenId: string;
	index: number;
	amount: string;
	name: string;
	decimals: number;
	type: string;
};

export type ExplorerOutputString = {
	boxId: string;
	transactionId: string;
	blockId: string;
	value: string;
	index: number;
	globalIndex: number;
	creationHeight: number;
	settlementHeight: number;
	ergoTree: string;
	ergoTreeConstants: string;
	ergoTreeScript: string;
	address: string;
	assets: ExplorerAssetString[];
	additionalRegisters: {
		R4: { serializedValue: string; sigmaType: string; renderedValue: string };
		R5: { serializedValue: string; sigmaType: string; renderedValue: string };
	};
	spentTransactionId: string | null;
	mainChain: boolean;
};

export type ExplorerOutputStringCustom = {
	boxId: string;
	transactionId: string;
	blockId: string;
	value: string;
	index: number;
	globalIndex: number;
	creationHeight: number;
	settlementHeight: number;
	ergoTree: string;
	ergoTreeConstants: string;
	ergoTreeScript: string;
	address: string;
	assets: ExplorerAssetString[];
	additionalRegisters: {
		R4: string;
		R5: string;
	};
	spentTransactionId: string | null;
	mainChain: boolean;
};

export async function getOracleBox(): Promise<OutputString> {
	const resp = await fetch(
		`http://213.239.193.208:9053/blockchain/box/unspent/byTokenId/${ORACLE_ERG_USD_NFT}`
	);
	let data = await resp.json();
	let oracleBox = data[0];
	oracleBox = boxToStrVal(oracleBox);
	return oracleBox;
}

export async function getBankBox(): Promise<OutputString> {
	const resp = await fetch(
		`http://213.239.193.208:9053/blockchain/box/unspent/byTokenId/${TOKEN_BANK_NFT}`
	);
	let data = await resp.json();
	let bankBox = data[0];
	bankBox = boxToStrVal(bankBox);
	return bankBox;
}
