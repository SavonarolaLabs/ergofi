import { dexyGold } from './dexyConstants';

export function interventionDeploymentRequest(): Object {
	const box = {
		address: dexyGold.interventionAddress,
		value: '1000000000',
		assets: [
			{
				tokenId: dexyGold.interventionNFT,
				amount: '1'
			}
		]
	};

	return box;
}
