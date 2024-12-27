export type Interaction = {
	id: string;
	amount: number;
	timestamp: number;
	price: number;
	type: 'Buy' | 'Sell';
	ergAmount: number;
	confirmed: boolean;
};
