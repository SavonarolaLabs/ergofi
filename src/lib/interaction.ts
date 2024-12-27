import { SIGUSD_BANK_TREE } from './api/ergoNode';
import {
	calculateAddressInfo,
	calculateOperationInfo,
	type OperationInfo
} from './TransactionUtils';
import type { Interaction } from './types/interaction';

export function txToSigmaUSDInteraction(tx): Interaction {
	const txData: OperationInfo = calculateOperationInfo(
		calculateAddressInfo(tx, SIGUSD_BANK_TREE),
		calculateAddressInfo(tx, tx.outputs[1]?.ergoTree || tx.inputs[0]?.ergoTree)
	);

	return {
		id: crypto.randomUUID(), // or a unique string from tx
		transactionId: tx.id,
		amount: Number(txData.amount.split(' ')[0]),
		timestamp: Date.now(),
		price: Number(txData.price),
		type: txData.operation,
		ergAmount: Number(txData.volume.split(' ')[0]),
		confirmed: false
	};
}
