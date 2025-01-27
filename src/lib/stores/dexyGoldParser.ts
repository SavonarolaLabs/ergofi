import type { Asset } from '$lib/api/ergoNode';
import { vitestTokenIds } from '$lib/dexygold/dexyConstants';

export function parseLpBox(box: any) {
	return {
		value: box.value,
		lpTokenAmount: box.assets.find((a: Asset) => a.tokenId == vitestTokenIds.lpToken),
		dexyUSDAmount: box.assets.find((a: Asset) => a.tokenId == vitestTokenIds.dexyUSD)
	};
}
