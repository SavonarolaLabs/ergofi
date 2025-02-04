export type UnconfirmedNodeBox = {
	additionalRegisters: Record<string, string>;
	assets: {
		amount: number;
		tokenId: string;
	}[];
	boxId: string;
	creationHeight: number;
	ergoTree: string;
	index: number;
	transactionId: string;
	value: number;
};

export type ConfirmedNodeBox = UnconfirmedNodeBox & {
	address: string;
	globalIndex: number;
	inclusionHeight: number;
	spentTransactionId: string | null;
};

export type NodeBox = UnconfirmedNodeBox | UnconfirmedNodeBox;

export type OracleData = {
	confirmed_erg_usd: ConfirmedNodeBox[];
	confirmed_erg_xau: ConfirmedNodeBox[];
	unconfirmed_erg_usd: UnconfirmedNodeBox[];
	unconfirmed_erg_xau: UnconfirmedNodeBox[];
	confirmed_dexygold_lp: ConfirmedNodeBox[];
	unconfirmed_dexygold_lp: UnconfirmedNodeBox[];
};
