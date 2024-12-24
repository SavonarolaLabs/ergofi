import { writable } from 'svelte/store';
import { assetPricingService, type AssetPriceRates } from './assetPricingService';

// // Тип для AssetPriceRates
// type AssetRate = { erg: number; fiat: number };
// export type AssetPriceRates = {
// 	[tokenId: string]: AssetRate;
// };

// Store для хранения цен
export const assetsPriceRates = writable<AssetPriceRates>({});

export async function loadPriceRates() {
	try {
		const tokens = await assetPricingService.getTokenRates();
		assetsPriceRates.set(tokens); // Устанавливаем данные напрямую, без JSON
		//console.log('Prices loaded:', tokens);
	} catch (error) {
		console.error('Error loading price rates:', error);
	}
}
