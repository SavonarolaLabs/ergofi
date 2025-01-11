import { SIGUSD_BANK_TREE, type MempoolTransaction, type Output } from '$lib/api/ergoNode';
import { FEE_CONTRACT } from '@fleet-sdk/core';

type BoxChainLink = {
	box: Output;
	inputBoxId?: string;
	minerFee: number;
	hasParent?: boolean;
};

export function getMaxFeeLeaf(txList: MempoolTransaction[]): Output | undefined {
	const bankOutputs = txList
		.flatMap((tx) => tx.outputs)
		.filter((o) => o.ergoTree == SIGUSD_BANK_TREE);

	const allInputsBoxIds = txList.flatMap((tx) => tx.inputs.flatMap((i) => i.boxId));

	console.log({ bankOutputs });
	const links = txList
		.map((tx) => txToBoxChainLink(tx, bankOutputs, allInputsBoxIds))
		.filter((x): x is BoxChainLink => !!x);
	console.log('links getMaxFeeLeaf', { links });
	const chains = buildChains(links);
	console.log({ chains });
	return getLeafOfMaxFeeChain(chains)?.box;
}

function getLeafOfMaxFeeChain(chains: BoxChainLink[][]): BoxChainLink | undefined {
	if (chains.length === 0) return undefined;
	const maxFeeChain = chains.reduce((maxChain, currentChain) => {
		const currentFeeSum = currentChain.reduce((sum, link) => sum + link.minerFee, 0);
		const maxFeeSum = maxChain.reduce((sum, link) => sum + link.minerFee, 0);
		return currentFeeSum > maxFeeSum ? currentChain : maxChain;
	}, [] as BoxChainLink[]);

	return maxFeeChain.at(-1) || undefined;
}

function txToBoxChainLink(
	tx: MempoolTransaction,
	bankOutputs: Output[],
	allInputsBoxIds: string[]
): BoxChainLink | undefined {
	const box = tx.outputs.find((o) => o.ergoTree == SIGUSD_BANK_TREE);
	const minerFee = tx.outputs.find((o) => o.ergoTree == FEE_CONTRACT)?.value;
	const inputBoxId = tx.inputs.find((i) =>
		bankOutputs.flatMap((o) => o.boxId).includes(i.boxId)
	)?.boxId;

	if (box && minerFee)
		return { box, minerFee, inputBoxId, hasParent: allInputsBoxIds.includes(box.boxId) };
}
function buildChains(links: BoxChainLink[]): BoxChainLink[][] {
	const leafs = links.filter((l) => l.hasParent == false);
	const chains = leafs.map((l) => {
		return buildChainFromLeaves(l, links);
	});
	return chains;
}

//Recursive way down
function buildChainFromLeaves(leaf: BoxChainLink, links: BoxChainLink[]): BoxChainLink[] {
	if (leaf.inputBoxId) {
		const wayDown: BoxChainLink = links.find((l) => l.box.boxId == leaf.inputBoxId)!;
		const currentChain = buildChainFromLeaves(wayDown, links);
		currentChain.push(leaf);
		return currentChain;
	} else {
		return [leaf];
	}
}
