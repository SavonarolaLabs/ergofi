import type { NodeBox } from '$lib/stores/bank.types';

export const userBoxes: NodeBox[] = [
	{
		boxId: '807e715029f3efba60ccf3a0f998ba025de1c22463c26db53287849ae4e31d3b',
		value: 602310307,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [],
		creationHeight: 1443463,
		additionalRegisters: {},
		transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
		index: 0
	}
];

export const oracleBoxes: { confirmed_erg_usd: NodeBox[] } = {
	confirmed_erg_usd: [
		{
			additionalRegisters: {
				R4: '05e082b38607',
				R5: '0486b7b101'
			},
			assets: [
				{
					amount: 1,
					tokenId: '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f'
				}
			],
			boxId: '5cdadb8abae146b8b46ce594bc646b693dcf04a6baa04f68420d85e740b3d92f',
			creationHeight: 1453501,
			ergoTree:
				'100904000580ade204040c0e2077dffd47b690caa52fe13345aaf64ecdf7d55f2e7e3496e8206311f491aa46cd04080404040004000e20720978c041239e7d6eb249d801f380557126f6324e12c5ba9172d820be2e1dded806d601b2a5730000d602c67201060ed603e4c6a70504d604c1a7d6059272047301d6069aa37302d1ec95e67202d801d607ed93e47202cbc2a793cbc272017303ecededededededed8fa3720391a39972037304720593db63087201db6308a792c17201720493e4c672010405e4c6a7040593e4c67201050472037207ededededededededed92a37203720593db63087201db6308a792c17201720493db63087201db6308a792c17201720493e4c672010405e4c6a7040592e4c672010504720690e4c6720105049a720673057207edededed93c27201c2a793db63087201db6308a791c17201720493e4c672010405e4c6a7040593e4c6720105047203938cb2db6308b2a4730600730700017308',
			index: 0,
			transactionId: 'e3d31aed0c8f07b3d710676cdfbbf324dfedf6f038853c2bbd4e153bc47d1f1a',
			value: 4147250000
		}
	]
};

export const simgaUsdConfirmedTransaction = {
	blockId: '075d95965ca32c0c052ea96ed6b0454f09b18bdf1404bb665758d4c06b6b568e',
	dataInputs: [],
	globalIndex: 7729227,
	id: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
	inclusionHeight: 1341548,
	index: 8,
	inputs: [
		{
			additionalRegisters: {},
			address: '9gZLYYtsC6EUhj4SK2XySR9duVorTcQxHK8oE4ZTdUEpReTXcAK',
			assets: [],
			boxId: '3e37ae1c5e76dc08fe9422c0abfc39835431260656edd900f71decbee842f4db',
			creationHeight: 1341544,
			ergoTree: '0008cd030c8f9c4dc08f3c006fa85a47c9156dedbede000a8b764c6e374fd097e873ba04',
			globalIndex: 42455741,
			inclusionHeight: 1341546,
			index: 0,
			spentTransactionId: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
			transactionId: '895ea7ab1b07475d1bebc6f9ac0cd113785d03b258e49a1dd933010282088379',
			value: 1000000000
		},
		{
			additionalRegisters: {},
			address: '9gZLYYtsC6EUhj4SK2XySR9duVorTcQxHK8oE4ZTdUEpReTXcAK',
			assets: [
				{
					amount: 1234321,
					tokenId: 'f0d5bdf474fcbd4249608e6dc6e9cf34a327b218f66445ea545b4c711b4676e3'
				},
				{
					amount: 69420,
					tokenId: '6ad70cdbf928a2bdd397041a36a5c2490a35beb4d20eabb5666f004b103c7189'
				},
				{
					amount: 1,
					tokenId: '75d7bfbfa6d165bfda1bad3e3fda891e67ccdcfc7b4410c1790923de2ccc9f7f'
				},
				{
					amount: 21069420,
					tokenId: 'ebb40ecab7bb7d2a935024100806db04f44c62c33ae9756cf6fc4cb6b9aa2d12'
				},
				{
					amount: 1,
					tokenId: '905ecdef97381b92c2f0ea9b516f312bfb18082c61b24b40affa6a55555c77c7'
				},
				{
					amount: 1,
					tokenId: '6597acef421c21a6468a2b58017df6577b23f00099d9e0772c0608deabdf6d13'
				},
				{
					amount: 3,
					tokenId: '7a776cf75b8b3a5aac50a36c41531a4d6f1e469d2cbcaa5795a4f5b4c255bf09'
				},
				{
					amount: 1,
					tokenId: '615be55206b1fea6d7d6828c1874621d5a6eb0e318f98a4e08c94a786f947cec'
				},
				{
					amount: 5,
					tokenId: '3277be793f89bd88706938dd09ad49afe29a62b67b596d54a5fd7e06bf8e71ce'
				},
				{
					amount: 100000000000,
					tokenId: '376603b9ecbb953202fbac977f418ab5edc9d9effafbbe1418f5aece661dfa1f'
				},
				{
					amount: 1,
					tokenId: 'c28c5104a4ceb13f9e6ca18f312d3e5d543e64a94eb2e4333e4d6c2f0590042a'
				}
			],
			boxId: 'f8ed9f2f90d8a771c51e6b9510bc8384720779a6b485d8570053f8065181596d',
			creationHeight: 1341542,
			ergoTree: '0008cd030c8f9c4dc08f3c006fa85a47c9156dedbede000a8b764c6e374fd097e873ba04',
			globalIndex: 42455498,
			inclusionHeight: 1341544,
			index: 1,
			spentTransactionId: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
			transactionId: 'd5c9b83b8dfa11e3f0319cc299d33bae2305012de092e2a51b952a6ab206ecf4',
			value: 2600712300886
		}
	],
	numConfirmations: 114012,
	outputs: [
		{
			additionalRegisters: {
				R4: '0400',
				R5: '0500'
			},
			address:
				'uZt1ATbixuZUbFETdSVaYJsRchfjGZdVSNg4wXgex88vDTAPdrzVgQaeuJF5VsjCdsXtSoGtVdhELFYhjvVaw7ek4sp61vC8YVQjCqFvByJaFWxX28S4PpZR7zjyZf7DqYsCnN5gJku871FwDnQGSqSHn2Z7HJxSDkipTzPBrXCLByig394Av9K2cvnp8jQd5EynzJf3z3ungHpmL43sAyfrghH66R5dDSZfEWFCMcQkNKZzpLfCvCwgPMLie6jevKR7q32W3zqdNnGxE7Gf67WT1qBk3AMxCyKpsR5ZHmjzRSEh6yScSsoiQiQyjXqqDr8NtnJ8oLcaM8WhNAK2Duc6mQzSGLUUySFt8P9WcXKwAJ4z1zBRzsrDt4zZipaoh9CtcjCfyEQdYtCfRj82oVRdgC33Y2ybUvh2vGSMqtvW4L4JXsNQVTKcy7AKN6XXu3WfdWmJC9bxgnrw3iEj1zf4Xke5YPAfGtYKpPYErcQEqUe2mkPTp6ZrsqvqVhSH4eTqFWrTk6qeqJYmNw6WdfzzSGVw4aM4P5BGCnoRsx8eLXsm2gQNufJdzVUjXht7Mjswt3wLZMvAoHUXZAyjymLWkerkYVSS4smooJWTDRJJxn7ZzwBrJGwDsbPWskjgzz2V6aapveVXGK9WA3Zmr1581B3TQr8coL8GDUksdJjAZT578Pj8ZKGwK4f5eYonj9NAEYPNm9bSdTyPWVrT91y5RJsSiZo1bc4xCc6DrrAEaN6VT2fwCuhngy8AZ8hh1bcETBnqPAEj4Zu3a61mioEt85bYt6FbaDeriVEEtRkRa74Cu2UibtjzuMoqah85udXYz26y8jyuBFf1SPTEb8V7wYGEEyFMfVtaAtDitsy3KwndogYzogBWk2Z6zkxjmMVnEgM',
			assets: [
				{
					amount: 1,
					tokenId: 'c28c5104a4ceb13f9e6ca18f312d3e5d543e64a94eb2e4333e4d6c2f0590042a'
				}
			],
			boxId: 'a524bb68d37ef007490b3683bdd7b22e28270cf924d3c594e96a66067f71f5cf',
			creationHeight: 1341546,
			ergoTree:
				'102004040402040404000580897a04d00f04d60f04040402040204020402040404000404043c05c80104ca0104000e2075d7bfbfa6d165bfda1bad3e3fda891e67ccdcfc7b4410c1790923de2ccc9f7f04000e20905ecdef97381b92c2f0ea9b516f312bfb18082c61b24b40affa6a55555c77c704000e20bf24ed4af7eb5a7839c43aa6b240697d81b196120c837e1a941832c266d3755c04000e203c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a04000e2031bf6b4ee0bb108e155040dc93927dacef8f7af858be1ec53f232131be20e66f043c040a05000500d817d601db6501fed602b27201730000d603b27201730100d604c17203d605db63087203d6068cb2720573020002d607b27201730300d6089de4c6720704057304d6097305d60a9d9c72087e7306057e720905d60b9d9c72087e7307057e720905d60c9a720a720bd60db2a4730800d60edb6308720dd60fb2a5730900d610998cb2720e730a00028cb2db6308720f730b0002d611e4c6a70404d6129591a372119d9972049c720c7206720ce4c6a70505d613b2a4730c00d614b2a5730d00d615e4c672140404d61699c1720fc1720dd61799c1b2a5730e00c17213d1ededededededededed8fe4c67202070499a3730f919c9d7204720673109c7e731105720c9072107212938cb2720e731200017313938cb27205731400017315938cb2db63087213731600017317938cb2db63087207731800017319938cb2db63087202731a0001731bedededed93db63087214db6308a793c27214c2a792c17214c1a793e4c67214050599721272109590a372119372157211d801d6189aa3731ced92721572189072159a7218731deded9272169c7210720a917216731eed9272179c7210720b917217731f',
			globalIndex: 42455784,
			inclusionHeight: 1341548,
			index: 0,
			spentTransactionId: null,
			transactionId: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
			value: 500000000
		},
		{
			additionalRegisters: {},
			address:
				'2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe',
			assets: [],
			boxId: '34b888644943c86d934313bed884cc5137c045bbb386d323de5d774426be4668',
			creationHeight: 1341546,
			ergoTree:
				'1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
			globalIndex: 42455785,
			inclusionHeight: 1341548,
			index: 1,
			spentTransactionId: '4c47b080fccb535c88b4b4c1c6d8fbbe4ce76d91f82d47e25f8cb7b4fe65f4ef',
			transactionId: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
			value: 1000000
		},
		{
			additionalRegisters: {},
			address: '9gZLYYtsC6EUhj4SK2XySR9duVorTcQxHK8oE4ZTdUEpReTXcAK',
			assets: [
				{
					amount: 1234321,
					tokenId: 'f0d5bdf474fcbd4249608e6dc6e9cf34a327b218f66445ea545b4c711b4676e3'
				},
				{
					amount: 69420,
					tokenId: '6ad70cdbf928a2bdd397041a36a5c2490a35beb4d20eabb5666f004b103c7189'
				},
				{
					amount: 1,
					tokenId: '75d7bfbfa6d165bfda1bad3e3fda891e67ccdcfc7b4410c1790923de2ccc9f7f'
				},
				{
					amount: 21069420,
					tokenId: 'ebb40ecab7bb7d2a935024100806db04f44c62c33ae9756cf6fc4cb6b9aa2d12'
				},
				{
					amount: 1,
					tokenId: '905ecdef97381b92c2f0ea9b516f312bfb18082c61b24b40affa6a55555c77c7'
				},
				{
					amount: 1,
					tokenId: '6597acef421c21a6468a2b58017df6577b23f00099d9e0772c0608deabdf6d13'
				},
				{
					amount: 3,
					tokenId: '7a776cf75b8b3a5aac50a36c41531a4d6f1e469d2cbcaa5795a4f5b4c255bf09'
				},
				{
					amount: 1,
					tokenId: '615be55206b1fea6d7d6828c1874621d5a6eb0e318f98a4e08c94a786f947cec'
				},
				{
					amount: 5,
					tokenId: '3277be793f89bd88706938dd09ad49afe29a62b67b596d54a5fd7e06bf8e71ce'
				},
				{
					amount: 100000000000,
					tokenId: '376603b9ecbb953202fbac977f418ab5edc9d9effafbbe1418f5aece661dfa1f'
				}
			],
			boxId: 'b06ee073fe2c2b7436f8f7705616a4c1eac295609f22008a34eaafeead7f3dd4',
			creationHeight: 1341546,
			ergoTree: '0008cd030c8f9c4dc08f3c006fa85a47c9156dedbede000a8b764c6e374fd097e873ba04',
			globalIndex: 42455786,
			inclusionHeight: 1341548,
			index: 2,
			spentTransactionId: 'ea8cb18052671c81abdbf2788fc0e7032e27aa7eb643922a20064607c8a7cdcd',
			transactionId: '8fa18c55c710f267d15d8f107fcf4d526d5e51583b0feaed8a9cd858900705d7',
			value: 2601211300886
		}
	],
	size: 1401,
	timestamp: 1725053806156
};
