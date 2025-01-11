import { SIGUSD_BANK_TREE, type MempoolTransaction, type Output } from '$lib/api/ergoNode';
import { FEE_CONTRACT } from '@fleet-sdk/core';

type BoxChainLink = {
	box: Output;
	inputBoxId?: string;
	minerFee: number;
};

export function getMaxFeeLeaf(txList: MempoolTransaction[]): Output | undefined {
	const bankOutputs = txList
		.flatMap((tx) => tx.outputs)
		.filter((o) => o.ergoTree == SIGUSD_BANK_TREE);
	const links = txList
		.map((tx) => txToBoxChainLink(tx, bankOutputs))
		.filter((x): x is BoxChainLink => !!x);
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

	return maxFeeChain[0] || undefined;
}

function txToBoxChainLink(tx: MempoolTransaction, bankOutputs: Output[]): BoxChainLink | undefined {
	const box = tx.outputs.find((o) => o.ergoTree == SIGUSD_BANK_TREE);
	const minerFee = tx.outputs.find((o) => o.ergoTree == FEE_CONTRACT)?.value;
	const inputBoxId = tx.inputs.find((i) =>
		bankOutputs.flatMap((o) => o.boxId).includes(i.boxId)
	)?.boxId;

	if (box && minerFee) return { box, minerFee, inputBoxId };
}

function buildChains(links: BoxChainLink[]): BoxChainLink[][] {
	const chains: BoxChainLink[][] = [];
	const boxMap = new Map<string, BoxChainLink>();
	const visited = new Set<string>();

	links.forEach((link) => boxMap.set(link.box.boxId, link));

	function buildChain(startLink: BoxChainLink): BoxChainLink[] {
		const chain: BoxChainLink[] = [];
		let currentLink: BoxChainLink | undefined = startLink;

		while (currentLink) {
			if (visited.has(currentLink.box.boxId)) break;

			chain.push(currentLink);
			visited.add(currentLink.box.boxId);

			if (!currentLink.inputBoxId) break;
			currentLink = boxMap.get(currentLink.inputBoxId);
		}

		return chain;
	}

	links.forEach((link) => {
		if (!visited.has(link.box.boxId)) {
			const chain = buildChain(link);
			if (chain.length > 0) chains.push(chain);
		}
	});

	return chains;
}
