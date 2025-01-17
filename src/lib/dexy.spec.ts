import { describe, it, expect } from 'vitest';
import { compileContract } from './compile';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
import { ALICE_MNEMONIC, BOB_MNEMONIC } from './private/mnemonics';
import { signTx } from './signing';

//contract: 2CBn1o6s3eZnsP7rpTPJonaZMcUtnQEpLzrU36hasAP8RCc9jAU9Xtm4dh31acbcdsuxZm9VrYVNojvyw2hWPTUXxz
const testTokenId = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'; //03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04
const $testTokenId = Buffer.from(testTokenId, 'hex').toString('base64');

let nftOracleContract = `{
  val oracleBoxIndex = 0 // data input
  val oracleNFT = fromBase64("${$testTokenId}") // to identify oracle pool box
  val oracleBox = CONTEXT.dataInputs(oracleBoxIndex)
  val validOracleBox = oracleBox.tokens(0)._1 == oracleNFT

  sigmaProp(validOracleBox)
}`;

describe('Contract Compilation', () => {
	it('compile test contract', () => {
		const address = compileContract(nftOracleContract);
		expect(address).toBe(
			'2CBn1o6s3eZnsP7rpTPJonaZMcUtnQEpLzrU36hasAP8RCc9jAU9Xtm4dh31acbcdsuxZm9VrYVNojvyw2hWPTUXxz'
		);
	});
	it('take box from contract', async () => {
		const unsigned = buildTx();
		const signed = await signTx(unsigned, BOB_MNEMONIC);
		console.dir(JSON.stringify(signed), { depth: null });
		expect(signed).toBeTruthy();
	});
});

const unsignedTx = {
	inputs: [
		{
			boxId: 'cd156a4ab3f508c1c4c3999cd277ed0086446b06c5d6e8c47ab481c04e05145d',
			value: '1853817481337503',
			ergoTree:
				'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329',
			creationHeight: 1441463,
			assets: [
				{
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
					amount: '9999920824786'
				},
				{
					tokenId: '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0',
					amount: '9996656111109'
				},
				{
					tokenId: '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9',
					amount: '1'
				}
			],
			additionalRegisters: {
				R5: '05f8c7fdf418',
				R4: '05def8c04b'
			},
			transactionId: '98aa45168c0782af81bdfdf07f123346d8d79ec1c1a469dda3d4f66dfc96348b',
			index: 0,
			extension: {}
		},
		{
			boxId: '02486eeb56b6157afc07be1f5a45c29db6148f1819eb9bc1e2e7f4b611c2d951',
			value: '653810307',
			ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
			creationHeight: 1431340,
			assets: [],
			additionalRegisters: {},
			transactionId: '9dcb8bbf1e5194c02d5c3513e84da5c0d791ab1e7c30dcc192cc7ba50adbb68c',
			index: 2,
			extension: {}
		},
		{
			boxId: 'ad2bc65ce7b30b49c18ea79c5fb3ca34a07f6ef5a72e7a716f23110962afdfe3',
			value: '622466796',
			ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
			creationHeight: 1431395,
			assets: [],
			additionalRegisters: {},
			transactionId: '8703bce1c1b121955294fb31f0e220778d545e8d36161ee0eddef07c0bb6d6a8',
			index: 2,
			extension: {}
		}
	],
	dataInputs: [
		{
			additionalRegisters: {
				R4: '059ac4f7f503',
				R5: '04e2faaf01',
				R6: '0e20f7ef73c4a4ab91b84bb0a2905108d534114472ec057be3a57a9dfc9b1fbd85c1'
			},
			address:
				'NTkuk55NdwCXkF1e2nCABxq7bHjtinX3wH13zYPZ6qYT71dCoZBe1gZkh9FAr7GeHo2EpFoibzpNQmoi89atUjKRrhZEYrTapdtXrWU4kq319oY7BEWmtmRU9cMohX69XMuxJjJP5hRM8WQLfFnffbjshhEP3ck9CKVEkFRw1JDYkqVke2JVqoMED5yxLVkScbBUiJJLWq9BSbE1JJmmreNVskmWNxWE6V7ksKPxFMoqh1SVePh3UWAaBgGQRZ7TWf4dTBF5KMVHmRXzmQqEu2Fz2yeSLy23sM3pfqa78VuvoFHnTFXYFFxn3DNttxwq3EU3Zv25SmgrWjLKiZjFcEcqGgH6DJ9FZ1DfucVtTXwyDJutY3ksUBaEStRxoUQyRu4EhDobixL3PUWRcxaRJ8JKA9b64ALErGepRHkAoVmS8DaE6VbroskyMuhkTo7LbrzhTyJbqKurEzoEfhYxus7bMpLTePgKcktgRRyB7MjVxjSpxWzZedvzbjzZaHLZLkWZESk1WtdM25My33wtVLNXiTvficEUbjA23sNd24pv1YQ72nY1aqUHa2',
			assets: [
				{
					amount: 1,
					tokenId: '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f'
				}
			],
			boxId: '40059b9608a4c1b54d450139367776917ec702d0a4d9f56efd81cf07da178655',
			creationHeight: 1441454,
			ergoTree:
				'1014040004000e208c27dd9d8a35aac1e3167d58858c0a8b4059b277da790552e37eba22df9b903504000400040204020101040205a0c21e040204080500040c040204a0c21e0402050a05c8010402d806d601b2a5730000d602b5db6501fed9010263ed93e4c67202050ec5a7938cb2db63087202730100017302d603b17202d604e4c6b272027303000605d605d90105049590720573047204e4c6b272029972057305000605d606b07202860273067307d901063c400163d803d6088c720601d6098c720801d60a8c72060286029a72097308ededed8c72080293c2b2a5720900d0cde4c6720a040792c1b2a5720900730992da720501997209730ae4c6720a0605ea02d1ededededededed93cbc27201e4c6a7060e927203730b93db63087201db6308a793e4c6720104059db07202730cd9010741639a8c720701e4c68c72070206057e72030593e4c6720105049ae4c6a70504730d92c1720199c1a77e9c9a7203730e730f058c72060292da720501998c72060173109972049d9c720473117312b2ad7202d9010763cde4c672070407e4c6b2a5731300040400',
			globalIndex: 45690731,
			inclusionHeight: 1441456,
			index: 0,
			spentTransactionId: null,
			transactionId: 'a5b297c51ba59aca8014748ebf4b71497a3b28b93ed6715a2c9966fff30d97db',
			value: 5346750000
		}
	],
	outputs: [
		{
			value: '1853818474495228',
			ergoTree:
				'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329',
			creationHeight: 1441464,
			assets: [
				{
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
					amount: '9999920824601'
				},
				{
					tokenId: '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0',
					amount: '9996656111109'
				},
				{
					tokenId: '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9',
					amount: '1'
				}
			],
			additionalRegisters: {
				R4: '05d0fbc04b',
				R5: '05f8c7fdf418'
			}
		},
		{
			value: '1000000',
			ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
			creationHeight: 1441464,
			assets: [
				{
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
					amount: '185'
				}
			],
			additionalRegisters: {
				R4: '05f202',
				R5: '05ba8993b307'
			}
		},
		{
			value: '5742275',
			ergoTree: '0008cd0207d9588bf49081c6c84bf93c5c365f57204c261dd2f184f73e5aa7c7182b2679',
			creationHeight: 1441464,
			assets: [],
			additionalRegisters: {}
		},
		{
			value: '1100000',
			ergoTree:
				'1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
			creationHeight: 1441464,
			assets: [],
			additionalRegisters: {}
		},
		{
			value: '275277103',
			ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
			creationHeight: 1441464,
			assets: [],
			additionalRegisters: {}
		}
	]
};

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
		.withDataFrom(potentialDataInputBox)
		.from(inputBox)
		.to(output)
		.sendChangeTo(BOB_ADDRESS)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	return unsignedTx;
}
