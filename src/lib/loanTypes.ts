export type LoanParams = {
	type: 'on-close' | 'fixed-height'; // Тип займа: on-close или с фиксированной высотой блоков
	amount: bigint; // Сумма займа (в nanoERGs)
	repayment: bigint; // Сумма погашения (в nanoERGs)
	tokenId: string; // ID токена (например, 'ERG')
	maturityLength: number; // Длина займа в блоках
	collateral: bigint; // Сумма обеспечения (в nanoERGs)
};

export type LoanTransactionResult = {
	txId: string; // ID транзакции
	status: 'pending' | 'confirmed' | 'failed';
	timestamp?: string; // Временная метка создания транзакции
};

export type LoanStatus = {
	loanId: string; // Уникальный ID займа
	status: 'active' | 'closed' | 'defaulted'; // Статус займа
	remainingRepayment: bigint; // Оставшаяся сумма для погашения
	maturityBlock: number; // Блок погашения
};
