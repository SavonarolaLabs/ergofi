import { DEXY_GOLD } from './dexyConstants';

export function interventionDeploymentRequest(): Object {
	const box = {
		address: DEXY_GOLD.interventionAddress,
		value: '1000000000',
		assets: [
			{
				tokenId: DEXY_GOLD.interventionNFT,
				amount: '1'
			}
		]
	};

	return box;
}
