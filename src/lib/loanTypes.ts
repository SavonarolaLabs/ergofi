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

// ------- CLASSIC TYPES -------------
export enum AssetType {
	PictureArtwork = '0101',
	AudioArtwork = '0102',
	VideoArtwork = '0103',
	ThresholdSignature = '0201'
}

type AssetPriceConversion = {
	rate: number;
	currency: string;
};

export type AssetMetadata = {
	name?: string;
	decimals?: number;
	type?: AssetType;
	url?: string;
};

export type AssetInfo<AmountType> = {
	metadata?: AssetMetadata;
	conversion?: AssetPriceConversion;
	tokenId: string;
	amount: AmountType;
};

export type VerifiedAsset = Required<Pick<AssetInfo<bigint>, 'tokenId' | 'metadata'>>;
