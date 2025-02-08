import {
	dexygold_bank_arbitrage_mint_box,
	dexygold_bank_box,
	dexygold_bank_free_mint_box,
	dexygold_buyback_box,
	dexygold_lp_box,
	dexygold_lp_mint_box,
	dexygold_lp_redeem_box,
	dexygold_lp_swap_box,
	dexygold_tracking101_box,
	dexygold_tracking95_box,
	dexygold_tracking98_box,
	oracle_erg_xau_box
} from './dexyGoldStore';
import { signedTxMock } from './signedTxMock';

const signedTx = signedTxMock;

export async function initJsonTestBoxes() {
	//dexygold_lp_box.set(outputBoxes.lp);
	dexygold_lp_box.set(signedTx.outputs[13]);
	dexygold_lp_swap_box.set(signedTx.outputs[9]);
	dexygold_lp_mint_box.set(signedTx.outputs[10]);
	dexygold_lp_redeem_box.set(signedTx.outputs[11]);
	oracle_erg_xau_box.set(signedTx.outputs[14]);

	dexygold_bank_free_mint_box.set(signedTx.outputs[0]); //[0]
	dexygold_bank_arbitrage_mint_box.set(signedTx.outputs[1]); //[1]
	dexygold_tracking95_box.set(signedTx.outputs[2]); // [2]
	dexygold_tracking98_box.set(signedTx.outputs[3]); // [3]
	dexygold_tracking101_box.set(signedTx.outputs[4]); //[4]
	dexygold_bank_box.set(signedTx.outputs[5]); //[5]
	dexygold_buyback_box.set(signedTx.outputs[6]); //[6]

	//---------------------------------------

	//dexygold_bank_intervention_box.set(outputBoxes.intervention);
	//dexygold_bank_payout_box.set(outputBoxes.payout);
	//dexygold_lp_extract_box.set(outputBoxes.lpExtract);
}
