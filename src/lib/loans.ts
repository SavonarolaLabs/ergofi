import { OpenOrderPlugin } from './plugins';
import { ErgoAddress } from '@fleet-sdk/core';

export type LoanParams = {
	type: 'on-close' | 'fixed-height';
	amount: bigint;
	repayment: bigint;
	tokenId: string;
	maturityLength: number; // Срок займа в блоках
	collateral: bigint; // Сумма обеспечения в nanoERG
};

export async function createLoan(loanParams: LoanParams): Promise<string> {
	try {
		// Подключение к кошельку Ergo
		await window.ergoConnector.nautilus.connect();
		// Получаем адрес заемщика
		const borrower = await ergo.get_change_address();

		// Параметры займа
		const params = {
			type: loanParams.type,
			borrower: ErgoAddress.fromBase58(borrower),
			loan: {
				amount: loanParams.amount,
				repayment: loanParams.repayment,
				tokenId: loanParams.tokenId
			},
			maturityLength: loanParams.maturityLength,
			collateral: {
				nanoErgs: loanParams.collateral
			}
		};

		// Строим транзакцию
		const tx = await ergo.txPlugin([OpenOrderPlugin(params)]).build();
		const signedTx = await ergo.sign_tx(tx);
		const txId = await ergo.submit_tx(signedTx);

		console.log('Transaction ID:', txId);
		return txId;
	} catch (error) {
		console.error('Error creating loan:', error);
		throw error;
	}
}
