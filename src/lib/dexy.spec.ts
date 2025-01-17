import { describe, it, expect } from 'vitest';
import { compileContract } from './compile';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
import { BOB_MNEMONIC } from './private/mnemonics';
import { signTx } from './signing';

const depositContract = `
{
	def getSellerPk(box: Box)              = box.R4[Coll[SigmaProp]].get(0)
	def getPoolPk(box: Box)                = box.R4[Coll[SigmaProp]].get(1)
	def unlockHeight(box: Box)             = box.R5[Int].get
	
	if(HEIGHT > unlockHeight(SELF)){
		getSellerPk(SELF)
	}else{
		getSellerPk(SELF) && getPoolPk(SELF)
	}
}
`;

describe('Contract Compilation', () => {
	it('should produce a valid address for depositContract', () => {
		const address = compileContract(depositContract);
		expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{95,}$/);
	});
	it('123', async () => {
		const unsigned = buildTx();
		const signed = await signTx(unsigned, BOB_MNEMONIC);
		console.log(unsigned);
	});
});

function buildTx(): any {
	const BOB_ADDRESS = '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU';

	const inputBox = {
		boxId: '0831e59451abef1a8b994937c48dffb2455a5015f4645f00a89995b1e579ffaf',
		value: '5000000',
		ergoTree:
			'1003040004000e2003faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04d1938cb2db6308b2db6501fe730000730100017302',
		assets: [],
		creationHeight: 1441404,
		additionalRegisters: {},
		transactionId: '31a6ddd01eedb3a63d07229aeed04cc7c3582890f98da3fbeaa1470c0dc6c8dc',
		index: 0
	};
	const output = new OutputBuilder(5000000n - RECOMMENDED_MIN_FEE_VALUE, BOB_ADDRESS);

	const potentialDataInputBox = {
		boxId: 'f8c74178f452ad02b0efef0453a0734821c2eb80edd2629d7b6d9659d5450df0',
		value: '1000000',
		ergoTree: '0008cd02eb083423041003740c9e791b2fea5ecf6e273669630a25b7ecabf9145395e447',
		assets: [
			{
				tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
				amount: '150'
			},
			{
				tokenId: 'd2d0deb3b0b2c511e523fd43ae838ba7b89e4583f165169b90215ff11d942c1f',
				amount: '1000000000000000'
			},
			{
				tokenId: 'b73a806dee528632b8d76f07813a1f1b66b8e11bc32b3ad09f8051265f3664ab',
				amount: '49999800000000000'
			},
			{
				tokenId: 'f60bff91f7ae3f3a5f0c2d35b46ef8991f213a61d7f7e453d344fa52a42d9f9a',
				amount: '49999999940'
			}
		],
		creationHeight: 1359943,
		additionalRegisters: {},
		transactionId: '341f0a5de9bb4fdf0c39d99d1b29a8cfff72baf9ff00baeb7ea21e395122b1ea',
		index: 2
	};

	const unsignedTx = new TransactionBuilder(1441406)
		.from(inputBox)
		.to(output)
		.sendChangeTo(BOB_ADDRESS)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	unsignedTx.dataInputs = [potentialDataInputBox];

	return unsignedTx;
}
