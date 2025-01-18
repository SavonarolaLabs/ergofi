import { Network } from '@fleet-sdk/common';
import { compile } from '@fleet-sdk/compiler';
import fs from 'fs';
import path from 'path';
import { contractConfig, mainnetTokenIds } from './dexyConstants';

export function compileContract(contract: string, map = {}) {
	const tree = compile(contract, {
		map,
		version: 0,
		includeSize: false
	});
	return tree.toAddress(Network.Mainnet).toString();
}

export function compileContractFromFile(fileName: string): string {
	const contractFile = path.resolve('src/lib/dexygold/contracts', fileName);
	const contract = fs.readFileSync(contractFile, 'utf-8');
	return compileContract(contract);
}

export function compileDexyContractFromFile(fileName: string): string {
	const contractFile = path.resolve('src/lib/dexygold/contracts', fileName);
	const contract = fs.readFileSync(contractFile, 'utf-8');

	const variables = { ...mainnetTokenIds, ...contractConfig };
	const updatedContract = replaceVariablesInContract(contract, variables);
	console.warn(updatedContract);
	return compileContract(updatedContract);
}

function replaceVariablesInContract(contract: string, variables: Record<string, string>): string {
	let updatedContract = contract;

	for (const [key, value] of Object.entries(variables)) {
		const placeholder = `$${key}`;
		updatedContract = updatedContract.replaceAll(placeholder, value);
	}

	return updatedContract;
}

/*
export function compileDepositContract() {
	return compileContractFromFile('deposit.es');
}

export function compileDepositProxyContract(
	userPk,
	unlockHeight,
	minerFee = RECOMMENDED_MIN_FEE_VALUE
) {
	const contractFile = path.join(__dirname, '../contracts', 'deposit-proxy.es');
	const contract = fs.readFileSync(contractFile, 'utf-8');
	return compileContract(contract, {
		_depositAddress: SColl(SByte, ErgoAddress.fromBase58(DEPOSIT_ADDRESS).ergoTree).toHex(),
		_userPk: SColl(SByte, ErgoAddress.fromBase58(userPk).ergoTree).toHex(),
		_poolPk: SColl(SByte, ErgoAddress.fromBase58(SHADOWPOOL_ADDRESS).ergoTree).toHex(),
		_unlockHeight: SInt(unlockHeight).toHex(),
		_minerFee: SLong(minerFee).toHex()
	});
}

export function compileBuyContract() {
	return compileContractFromFile('buy-token-for-erg.es');
}

export function compileSellContract() {
	return compileContractFromFile('sell-token-for-erg.es');
}

export function compileSwapContract() {
	return compileContractFromFile('swap-tokens.es');
}
*/
