import { get, writable, type Writable } from 'svelte/store';
import { sumAssets, sumNanoErg } from '$lib/utils/helper';
import type { Amount, Box, SignedTransaction, TokenAmount, TokenId } from '@fleet-sdk/common';
import { ERGO_TOKEN_ID } from './ergoTokens';

export const web3wallet_connected = writable(false);
export const web3wallet_wallet_name = writable('');
export const web3wallet_wallet_change_address = writable('');
export const web3wallet_available_wallets = writable([]);
export const web3wallet_confirmedTokens: Writable<TokenAmount<bigint>[]> = writable([]);

export async function loadWeb3WalletTokens() {
	try {
		const utxo = await ergo.get_utxos();

		const tokens = utxo.flatMap((box) => box.assets).reduce(sumAssets, []);

		const erg: bigint = sumNanoErg(utxo);
		if (erg > 0) {
			web3wallet_confirmedTokens.set([{ tokenId: ERGO_TOKEN_ID, amount: erg }, ...tokens]);
		} else {
			web3wallet_confirmedTokens.set(tokens);
		}

		const addr = await ergo.get_change_address();
		web3wallet_wallet_change_address.set(addr);
	} catch (e) {
		console.warn(`Failed to load ${get(web3wallet_wallet_name)} balance.`);
	}
}

export async function initWeb3WalletState() {
	const name = localStorage.getItem('ui_web3wallet_wallet_name');
	if (name) {
		web3wallet_wallet_name.set(name);
	}
	if (window.ergoConnector) {
		web3wallet_available_wallets.set(Object.keys(window.ergoConnector));
		if (get(web3wallet_wallet_name)) {
			if (window.ergoConnector[get(web3wallet_wallet_name)]?.isConnected) {
				await window.ergoConnector[get(web3wallet_wallet_name)]?.connect();
				web3wallet_connected.set(true);
				await loadWeb3WalletTokens();
			}
		} else {
			const connected = await window.ergoConnector[get(web3wallet_wallet_name)]?.connect();
			if (connected) {
				web3wallet_connected.set(true);
				await loadWeb3WalletTokens();
			} else {
				console.warn('Wallet reconnect failed');
			}
		}
	}
}

export async function disconnectWeb3Wallet() {
	await window.ergoConnector[get(web3wallet_wallet_name)].disconnect();
	web3wallet_connected.set(false);
	web3wallet_wallet_name.set('');
	web3wallet_wallet_change_address.set('');
	localStorage.removeItem('ui_web3wallet_wallet_name');
}

export async function connectWeb3Wallet(walletname = '') {
	const wallets = window.ergoConnector ? Object.keys(window.ergoConnector) : [];
	if (wallets.length > 0) {
		let connected = await window.ergoConnector[wallets[0]].connect();
		if (connected) {
			web3wallet_connected.set(true);
			web3wallet_wallet_name.set(wallets[0]);
			localStorage.setItem('ui_web3wallet_wallet_name', wallets[0]);
			await loadWeb3WalletTokens();
		} else {
			console.warn(`Connecting ${wallets[0]} failed.`);
		}
	}
}

export async function loadUIState() {
	await initWeb3WalletState();
}

// wallet_initialized
export const wallet_initialized = writable(false);

// market trades

interface MarketTrade {
	price: number;
	amount: number;
	time: string;
	side: string;
}

const dummy_trades = Array.from({ length: 50 }, () => ({
	price: 69001.34,
	amount: 1.302628,
	time: '20:20:12',
	side: Math.random() < 0.5 ? 'BUY' : 'SELL'
}));

export const market_trades: Writable<Array<MarketTrade>> = writable(dummy_trades);

export function addRecentTrades(recentTrades: Array<MarketTrade>) {
	market_trades.update((trades) => {
		const updatedTrades = [...recentTrades, ...trades];
		if (updatedTrades.length > 50) {
			updatedTrades.length = 50;
		}
		return updatedTrades;
	});
	recentTrades.forEach((trade) => {
		orderbook_latest.set({
			price: trade.price.toFixed(2),
			value: (trade.price * trade.amount).toFixed(2),
			side: trade.side
		});
		showToast(
			`order filled: ${trade.amount}rsBTC for $${(trade.price * trade.amount).toFixed(2)}`,
			'success'
		);
	});
}

interface Order {
	price: number;
	amount: number;
	value: number;
}

export const orderbook_sell: Writable<Array<Order>> = writable([]);
export const orderbook_buy: Writable<Array<Order>> = writable([]);
export const orderbook_latest = writable({
	price: '69,001.34',
	value: '69,001.34',
	side: 'SELL'
});

function roundToStep(price: number, step: number): number {
	return Math.floor(price / step) * step;
}
