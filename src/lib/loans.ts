import {
	OutputBuilder,
	TransactionBuilder,
	ErgoAddress,
	SLong,
	SAFE_MIN_BOX_VALUE
} from '@fleet-sdk/core';
import type { LoanParams } from './loanTypes'; // Обновлённый импорт

export async function createLoan(loanParams: LoanParams): Promise<string> {
	try {
		// Подключение к Ergo Wallet через Nautilus
		await window.ergoConnector.nautilus.connect();

		// Получаем адрес заемщика
		const borrowerAddress = await ergo.get_change_address();
		const borrowerErgoAddress = ErgoAddress.fromBase58(borrowerAddress);

		// Загружаем UTXO кошелька и текущую высоту блока
		const utxos = await ergo.get_utxos();
		const currentHeight = await ergo.get_current_height();

		// Настройка выходного бокса для займа
		const loanOutput = new OutputBuilder(SAFE_MIN_BOX_VALUE, SigmaBondsContracts.BOND_ORDER) // Контракт для OpenOrder
			.setAdditionalRegisters({
				R4: SLong(BigInt(borrowerAddress)).toHex(), // Адрес заемщика
				R5: SLong(loanParams.amount).toHex(), // Сумма займа
				R6: SLong(loanParams.repayment).toHex(), // Сумма погашения
				R7: SLong(BigInt(loanParams.maturityLength)).toHex() // Длина займа в блоках
			});

		// Добавление обеспечения (collateral)
		loanOutput.value = loanParams.collateral; // nanoERGs

		// Сборка транзакции
		const tx = new TransactionBuilder(currentHeight)
			.from(utxos)
			.to([loanOutput])
			.sendChangeTo(borrowerErgoAddress)
			.payFee(1000000n) // Фиксированная комиссия 0.001 ERG
			.build();

		// Подписание и отправка транзакции
		const signedTx = await ergo.sign_tx(tx.toEIP12Object());
		const txId = await ergo.submit_tx(signedTx);

		console.log('Transaction ID:', txId);
		return txId; // Возвращаем ID транзакции
	} catch (error) {
		console.error('Error creating loan:', error);
		throw error;
	}
}

// Адреса контрактов SigmaBonds
const SigmaBondsContracts = {
	BOND_ORDER:
		'2f7L4F3Q9eCjdWRmxSENw18Bw5SPAf3vBaimRqgpWB5JayiqSWG2tvnc6kF8ae8mpYwtZasmVDzmgjbfa8EBTdA1u55yB8ypRZDDFhs6DmhQekuGvzBoViApMyKdAXCPriXMaJWgHxAdjtR7QhXSjdnyozxZ7ApXrQY6hDSX6H2Fg9siuGUQpTQ3oJDa8nScMGdLNK2T5A7oHs' // Mainnet Order Contract
};
