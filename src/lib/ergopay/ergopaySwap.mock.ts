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
	blockId: 'b984a527a3429521b1a6b684ff758cee11ee01e6284e333601a440b2b5daab30',
	dataInputs: [
		{
			boxId: 'fdc668150bd29ab525857a3243d26a40f6b6df1cef0f75b66a4c489d47fb34bc'
		}
	],
	globalIndex: 8554096,
	id: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
	inclusionHeight: 1455575,
	index: 2,
	inputs: [
		{
			additionalRegisters: {
				R4: '0580cbb92a',
				R5: '059685b5a319'
			},
			address:
				'MUbV38YgqHy7XbsoXWF5z7EZm524Ybdwe5p9WDrbhruZRtehkRPT92imXer2eTkjwPDfboa1pR3zb3deVKVq3H7Xt98qcTqLuSBSbHb7izzo5jphEpcnqyKJ2xhmpNPVvmtbdJNdvdopPrHHDBbAGGeW7XYTQwEeoRfosXzcDtiGgw97b2aqjTsNFmZk7khBEQywjYfmoDc9nUCJMZ3vbSspnYo3LarLe55mh2Np8MNJqUN9APA6XkhZCrTTDRZb1B4krgFY1sVMswg2ceqguZRvC9pqt3tUUxmSnB24N6dowfVJKhLXwHPbrkHViBv1AKAJTmEaQW2DN1fRmD9ypXxZk8GXmYtxTtrj3BiunQ4qzUCu1eGzxSREjpkFSi2ATLSSDqUwxtRz639sHM6Lav4axoJNPCHbY8pvuBKUxgnGRex8LEGM8DeEJwaJCaoy8dBw9Lz49nq5mSsXLeoC4xpTUmp47Bh7GAZtwkaNreCu74m9rcZ8Di4w1cmdsiK1NWuDh9pJ2Bv7u3EfcurHFVqCkT3P86JUbKnXeNxCypfrWsFuYNKYqmjsix82g9vWcGMmAcu5nagxD4iET86iE2tMMfZZ5vqZNvntQswJyQqv2Wc6MTh4jQx1q2qJZCQe4QdEK63meTGbZNNKMctHQbp3gRkZYNrBtxQyVtNLR8xEY8zGp85GeQKbb37vqLXxRpGiigAdMe3XZA4hhYPmAAU5hpSMYaRAjtvvMT3bNiHRACGrfjvSsEG9G2zY5in2YWz5X9zXQLGTYRsQ4uNFkYoQRCBdjNxGv6R58Xq74zCgt19TxYZ87gPWxkXpWwTaHogG1eps8WXt8QzwJ9rVx6Vu9a5GjtcGsQxHovWmYixgBU8X9fPNJ9UQhYyAWbjtRSuVBtDAmoV1gCBEPwnYVP5GCGhCocbwoYhZkZjFZy6ws4uxVLid3FxuvhWvQrVEDYp7WRvGXbNdCbcSXnbeTrPMey1WPaXX',
			assets: [
				{
					amount: 9999955488065,
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'
				},
				{
					amount: 9996607422134,
					tokenId: '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0'
				},
				{
					amount: 1,
					tokenId: '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9'
				}
			],
			boxId: 'a8b3a1c84730bf7d9e0346f95abe472fbfa116ca1bc1c5dc2b8f5be71e11d1f5',
			creationHeight: 1455100,
			ergoTree:
				'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329',
			globalIndex: 46127199,
			inclusionHeight: 1455102,
			index: 0,
			spentTransactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			transactionId: '5812962ab480bb05b7ff93dd48c7b3aae95e9b093c1e4060c94d66ba94994705',
			value: 1663994664961227
		},
		{
			additionalRegisters: {},
			address: '9eipZQaZCQhs9kLnt8dZvPaQMaRAkdHCsogASE6b8QN9JsJtNTm',
			assets: [],
			boxId: 'e709f3147ab525299c9d002f9059526a53552af97e0101cd1d81391fa2a2e707',
			creationHeight: 1438549,
			ergoTree: '0008cd021ab37d3e94451a2155d2dab148a73fb2abc793bac2d44a5cf74877346b93d66c',
			globalIndex: 45566653,
			inclusionHeight: 1438551,
			index: 2,
			spentTransactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			transactionId: 'ef70e51e5cf6d6c11012a9aa345ca383d1cd175a1fbdf21a37f20c1ea3f7917c',
			value: 4745785787
		}
	],
	numConfirmations: 0,
	outputs: [
		{
			additionalRegisters: {
				R4: '05e8d2b92a',
				R5: '059685b5a319'
			},
			address:
				'MUbV38YgqHy7XbsoXWF5z7EZm524Ybdwe5p9WDrbhruZRtehkRPT92imXer2eTkjwPDfboa1pR3zb3deVKVq3H7Xt98qcTqLuSBSbHb7izzo5jphEpcnqyKJ2xhmpNPVvmtbdJNdvdopPrHHDBbAGGeW7XYTQwEeoRfosXzcDtiGgw97b2aqjTsNFmZk7khBEQywjYfmoDc9nUCJMZ3vbSspnYo3LarLe55mh2Np8MNJqUN9APA6XkhZCrTTDRZb1B4krgFY1sVMswg2ceqguZRvC9pqt3tUUxmSnB24N6dowfVJKhLXwHPbrkHViBv1AKAJTmEaQW2DN1fRmD9ypXxZk8GXmYtxTtrj3BiunQ4qzUCu1eGzxSREjpkFSi2ATLSSDqUwxtRz639sHM6Lav4axoJNPCHbY8pvuBKUxgnGRex8LEGM8DeEJwaJCaoy8dBw9Lz49nq5mSsXLeoC4xpTUmp47Bh7GAZtwkaNreCu74m9rcZ8Di4w1cmdsiK1NWuDh9pJ2Bv7u3EfcurHFVqCkT3P86JUbKnXeNxCypfrWsFuYNKYqmjsix82g9vWcGMmAcu5nagxD4iET86iE2tMMfZZ5vqZNvntQswJyQqv2Wc6MTh4jQx1q2qJZCQe4QdEK63meTGbZNNKMctHQbp3gRkZYNrBtxQyVtNLR8xEY8zGp85GeQKbb37vqLXxRpGiigAdMe3XZA4hhYPmAAU5hpSMYaRAjtvvMT3bNiHRACGrfjvSsEG9G2zY5in2YWz5X9zXQLGTYRsQ4uNFkYoQRCBdjNxGv6R58Xq74zCgt19TxYZ87gPWxkXpWwTaHogG1eps8WXt8QzwJ9rVx6Vu9a5GjtcGsQxHovWmYixgBU8X9fPNJ9UQhYyAWbjtRSuVBtDAmoV1gCBEPwnYVP5GCGhCocbwoYhZkZjFZy6ws4uxVLid3FxuvhWvQrVEDYp7WRvGXbNdCbcSXnbeTrPMey1WPaXX',
			assets: [
				{
					amount: 9999955487565,
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'
				},
				{
					amount: 9996607422134,
					tokenId: '003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0'
				},
				{
					amount: 1,
					tokenId: '7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9'
				}
			],
			boxId: '7d7228081b0951a82e7838c9a794bd8f1920c0bb8492bdda0b2945ced9a6f378',
			creationHeight: 1455573,
			ergoTree:
				'102a0400040004000e20011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f0400040204020400040004020500050005c8010500050005feffffffffffffffff0105000580897a05000580897a040405c80104c0933805c00c0580a8d6b907050005c8010580dac40905000500040404040500050005a0060101050005a0060100040004000e20239c170b7e82f94e6b05416f14b8a2a57e0bfff0e3c93f4abbcd160b6a5b271ad801d601db6501fed1ec9591b172017300d821d602b27201730100d603938cb2db63087202730200017303d604b2a5730400d605c17204d606db6308a7d607b27206730500d6088c720702d609db63087204d60ab27209730600d60b8c720a02d60c947208720bd60db27206730700d60e8c720d02d60fb27209730800d6108c720f02d61194720e7210d612e4c6a70505d613e4c672040505d614e4c6a70405d615e4c672040405d616b2a5730900d617e4c672160405d61895720c730a7217d61995720c7217730bd61ac1a7d61be4c672160505d61c9de4c672020405730cd61da2a1721a9c7214721c730dd61e9572119ca1721c95937214730e730f9d721d72147218d801d61e99721a721d9c9593721e7310731195937212731273139d721e72127219d61f9d9c721e7e7314057315d6209c7215721cd6219591a3731673177318d62295937220731972219d9c7205731a7220edededed7203ededededed927205731b93c27204c2a7edec720c7211efed720c7211ed939a720872129a720b7213939a720e72149a72107215edededed939a721472187215939a721272197213939a721a721b7205927215731c927213731deded938c720f018c720d01938c720a018c720701938cb27209731e00018cb27206731f000193721b9a721e958f721f7320f0721f721f957211959172187321927222732273239591721973249072227221927222732572037326938cb2db6308b2a4732700732800017329',
			globalIndex: 46137086,
			inclusionHeight: 1455575,
			index: 0,
			spentTransactionId: null,
			transactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			value: 1663999099743747
		},
		{
			additionalRegisters: {
				R4: '05e807',
				R5: '05f0a4ab8521'
			},
			address: '9eipZQaZCQhs9kLnt8dZvPaQMaRAkdHCsogASE6b8QN9JsJtNTm',
			assets: [
				{
					amount: 500,
					tokenId: '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04'
				}
			],
			boxId: '809cc8e454321700765fd6612cd048a29daf28e956bf967d7114c4949c40effe',
			creationHeight: 1455573,
			ergoTree: '0008cd021ab37d3e94451a2155d2dab148a73fb2abc793bac2d44a5cf74877346b93d66c',
			globalIndex: 46137087,
			inclusionHeight: 1455575,
			index: 1,
			spentTransactionId: null,
			transactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			value: 1000000
		},
		{
			additionalRegisters: {},
			address: '9g8gaARC3N8j9v97wmnFkhDMxHHFh9PEzVUtL51FGSNwTbYEnnk',
			assets: [],
			boxId: '030a9da321ee239f99d111bfa79c359201b2c53f9bde715f5c38d787e25deb32',
			creationHeight: 1455573,
			ergoTree: '0008cd02d49458ef115476eda3d109d1aa9e6a9b7fb6624e595ec45da16f91d093f34516',
			globalIndex: 46137088,
			inclusionHeight: 1455575,
			index: 2,
			spentTransactionId: null,
			transactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			value: 20000000
		},
		{
			additionalRegisters: {},
			address:
				'2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe',
			assets: [],
			boxId: '8bc8210b66b9d3b83e33991c098405f5b63e395522bd8ebdf229ca0137a03657',
			creationHeight: 1455573,
			ergoTree:
				'1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
			globalIndex: 46137089,
			inclusionHeight: 1455575,
			index: 3,
			spentTransactionId: 'e3b829f5e96f3cd310d37fa51d2f9f104b408d320f826f32d8d4524cf8dee392',
			transactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			value: 5000000
		},
		{
			additionalRegisters: {},
			address: '9eipZQaZCQhs9kLnt8dZvPaQMaRAkdHCsogASE6b8QN9JsJtNTm',
			assets: [],
			boxId: 'a753c53f0a9e88544f546d0431ceed8d762940b3a44e7f1ff3bd996b00efe642',
			creationHeight: 1455573,
			ergoTree: '0008cd021ab37d3e94451a2155d2dab148a73fb2abc793bac2d44a5cf74877346b93d66c',
			globalIndex: 46137090,
			inclusionHeight: 1455575,
			index: 4,
			spentTransactionId: null,
			transactionId: 'fcb14bd5a01d550d165a06e8d24cec4295f9d4976086a71ab71b0d5e4c23e0fd',
			value: 285003267
		}
	],
	size: 1281,
	timestamp: 1738845639642
};

export const headers = [
	{
		extensionId: 'c44f7658315498b98ceabe7374f60cee9fb9f31e07f20bfb4f610546eebe1228',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738847436921,
		size: 220,
		unparsedBytes: '',
		stateRoot: '3d44f49aeadd39b9bf9c71a8a4cb228044dcae8de93377408bea9d2ac3d310fc19',
		height: 1455586,
		nBits: 117783533,
		version: 3,
		id: '0028a4249c5f365fc274bb5bbb2529856e2ce4f6589223bfe6ea9363bc097007',
		adProofsRoot: 'a64360a2b3737e820be9657e7c96eb347d0bf13b3cb43786b41899a506221030',
		transactionsRoot: 'd26d99a2bbcca33855a636d0f17a61a0eb7d8eb6d0270e16021b3fad39e577d0',
		extensionHash: 'c0e5490c0da1fea941e9abc802f49f33bef7b94a16d19a522a44161079b2164b',
		powSolutions: {
			pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: 'd72c843a6b6a33b6',
			d: 0
		},
		adProofsId: '71f1bc4797aae8871d09b50556d588f78580b9b6280e6eeab27c46c81e503431',
		transactionsId: '70c77d363667a9c43d61164f2c023ac1b7c46830e48c51caf858d0ff158c9737',
		parentId: '6c2810c6a595b7d60a10dd13dcdb89546cb746a41e865851e4f2ac97a6f9bb2c'
	},
	{
		extensionId: '0003a14b897f981e15f71145f442631df145319a715711ab522a54fb1ae59f68',
		difficulty: '1473263976841216',
		votes: '080000',
		timestamp: 1738847539551,
		size: 220,
		unparsedBytes: '',
		stateRoot: '24b0f6f767a65ab740da5958211f233ffc3be1b4e3b58a640e7b5ba181ea695d19',
		height: 1455587,
		nBits: 117783533,
		version: 3,
		id: '64b511562149c66c58bcb1b53462e626622299dc0aac5b4025ae1abcec3178fa',
		adProofsRoot: '4b7ed5e078bafa0bb92155f178af499ddc686dd3ba947038f3f0d6dafc65c53e',
		transactionsRoot: 'fc0fa03fc298415c7b4e39ab49980a7a360535c808e0a7448e6028decad7188a',
		extensionHash: '0b4eedd0b2e99635af70dffc2abca25a2422ccb9badc4b5341d06a5c9b5b761e',
		powSolutions: {
			pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '58842080cb110777',
			d: 0
		},
		adProofsId: '5aa8086d6c1506fd0dbdb0b38d715512257b07d9c3d9191797beeb2dacc43573',
		transactionsId: '83b6a15d3e252cea1ebbe299ff525897d85e0d82f57b55319bb84c0f602351df',
		parentId: '0028a4249c5f365fc274bb5bbb2529856e2ce4f6589223bfe6ea9363bc097007'
	},
	{
		extensionId: '31d11f12b6f81a9ef47e32e27f75da20dba044f32eed2764a40f86a42b4c5e31',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738847812241,
		size: 220,
		unparsedBytes: '',
		stateRoot: '5bb3e7121290c7177ba12eaf69d8c327fa44a4a3d892247b3229b02f17d337b219',
		height: 1455588,
		nBits: 117783533,
		version: 3,
		id: 'c1382d600aeac5e261fa866d6e9539cd05dbc85e7b6a0ee5a7c577c2cf2459f9',
		adProofsRoot: '59a4599129871a048f7e0531ad034e69106e8268d20e65cc2b86bc053eba5e81',
		transactionsRoot: '8af91cbe8527ae22d9e62866b2ac4daa182a54a61b73999fb6838e55c1479808',
		extensionHash: '373ada17f448ad3dfae52f497782d5ae15d3c29e9c6ac2e08e7ab1e603152c08',
		powSolutions: {
			pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '7acf70cddee73183',
			d: 0
		},
		adProofsId: '41f819d18c4654101119cf35b3c5a0da5ea536f8bc3573a86ef0fca9c30ab2ff',
		transactionsId: '6ea1f580433e8bbf40a797f3b8160363b6c27d602cc4702ce86dded7f29a5289',
		parentId: '64b511562149c66c58bcb1b53462e626622299dc0aac5b4025ae1abcec3178fa'
	},
	{
		extensionId: 'b329f71f0c4e653e385e654e8eca6d6069a40e61001f1ea7995da141cf7e9f9a',
		difficulty: '1473263976841216',
		votes: '080000',
		timestamp: 1738847891433,
		size: 220,
		unparsedBytes: '',
		stateRoot: '8aa4f35c780b751db207e79dc07576f2b7dab13e7782999b8ff7c2718dd5e6e819',
		height: 1455589,
		nBits: 117783533,
		version: 3,
		id: '260292e5d9ebb8a9f1de0473f815fbe33438f75e9e09ecf5b066a7a8ea730d75',
		adProofsRoot: '215954067cb3f118373eb296bbc8df329362972c0bd18bdb987e99a80fc2c799',
		transactionsRoot: '191dd099516e562a551b2916d6e7a19285a4392a9a1ff289530128195df169d4',
		extensionHash: '373ada17f448ad3dfae52f497782d5ae15d3c29e9c6ac2e08e7ab1e603152c08',
		powSolutions: {
			pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '02367800e940de84',
			d: 0
		},
		adProofsId: '0140812e2acdd3ae11b6f4f34f2467c90f03636a6c0d94d89812e1b0b253e589',
		transactionsId: 'e37201398d89b1fbaea066085b514d22a202fd2795cffc7e7d603bd8a0d4163f',
		parentId: 'c1382d600aeac5e261fa866d6e9539cd05dbc85e7b6a0ee5a7c577c2cf2459f9'
	},
	{
		extensionId: '44e92c82cbaeef4ec529cf5b77a41945cac36300de0556c36a755c7f27b0336a',
		difficulty: '1473263976841216',
		votes: '080000',
		timestamp: 1738848189408,
		size: 220,
		unparsedBytes: '',
		stateRoot: '5818229630d8350c015170b4b53ce25772c6a9fd30d162483e934573cd6aa9a919',
		height: 1455590,
		nBits: 117783533,
		version: 3,
		id: '7e915daeb65320551f85e99efb43e3799000db1d33c368bd67abb4b08afbb4ad',
		adProofsRoot: '4a974a3e715447c840c873110a6020f88c96921ba0293a01b615bfaeb3b990f4',
		transactionsRoot: '36e7b96ed9ba65bc251c3f3aed698b4b2bf827f59142fbdb90c1ce298d3d4101',
		extensionHash: '373ada17f448ad3dfae52f497782d5ae15d3c29e9c6ac2e08e7ab1e603152c08',
		powSolutions: {
			pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '6101b50055bfb7c8',
			d: 0
		},
		adProofsId: 'b5d35a270635e4ee366d797db46314ae260db2f76f8ffceddcdbb8ddf4ebd58a',
		transactionsId: '2eaacc892e69fd0b741f5e09e0cb68b3ea704ff89ead88c6822bb276b5f6bcd8',
		parentId: '260292e5d9ebb8a9f1de0473f815fbe33438f75e9e09ecf5b066a7a8ea730d75'
	},
	{
		extensionId: 'f05b6f27bc84464216112ca0582dae41f1f0d365a6a395db65beec65f756fa8d',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738848298800,
		size: 220,
		unparsedBytes: '',
		stateRoot: '90771fd29b57201f1c3b2ae8be8b85720a0b21e8f2418da33851f5fd0f53269419',
		height: 1455591,
		nBits: 117783533,
		version: 3,
		id: 'b186bb5a4dfa5f7f70cca76500a99a5696e18da86d499ab2cb109bc3fec072da',
		adProofsRoot: '1edb6e324edbc2385bc5595fb96655243ddc83582f4857e8c21fada3b1619703',
		transactionsRoot: '5448b35b6dd883828858ca96a35dc75e88d0f528ecaa1ae676554db393b61730',
		extensionHash: 'f04614bf8b6ff0fafcf900b8ce68d2d991017ef1cdceffa8f8c4723372e611fe',
		powSolutions: {
			pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '6a57d7f5ae9a251b',
			d: 0
		},
		adProofsId: '02da8e4444775c82c9401bca469be855315a28c31ae9f0db3fd518e2a5cd0554',
		transactionsId: '954478fd31414dc8923fce30772a3926b29c5891879bf9652f469fd690cc4d65',
		parentId: '7e915daeb65320551f85e99efb43e3799000db1d33c368bd67abb4b08afbb4ad'
	},
	{
		extensionId: 'd15d51d9abd432b9ec71875215eb7dccccc6e75851eba0a20652fa2b1a644bb6',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738848396676,
		size: 220,
		unparsedBytes: '',
		stateRoot: '47c0cf03c9e329f89c1d4d0639cf37444d417796f076b1b0c2bc6e33471ca81319',
		height: 1455592,
		nBits: 117783533,
		version: 3,
		id: 'c3612bcf1dfcdd23a0e77b31a8d76bb1d96dc9524f5e8a6401b27d94b266738d',
		adProofsRoot: 'a3440c4602b8db48815a1f9915f444a8a5a2456fdf73710ee8288f944f40bef4',
		transactionsRoot: 'ec3cedd4bc8c8d3033827e6b5deea3950b377f35063c86d684baa98228a3f10e',
		extensionHash: '4416b1132bc55e655e8ceaf8bf8d348ba8ff0c26b4b7423a02f15f4fcdd60c7e',
		powSolutions: {
			pk: '033133187bde16d8b847923852ac7fe5bfbb50a81f1c040d00850e1f776c18e1b5',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '67050c39a15ebfc9',
			d: 0
		},
		adProofsId: 'ca69f4f4736a01a522aa33064a0d7ae79f2878bb72406eec817885714c31bdd1',
		transactionsId: '5ae89e9768390508fc36072ed700ad73a1cb31241aa5d4d389e9b3bca16be698',
		parentId: 'b186bb5a4dfa5f7f70cca76500a99a5696e18da86d499ab2cb109bc3fec072da'
	},
	{
		extensionId: '3e2dcac887089826cea3eef48bbd4e3f4ea51036e9743839a367285f46768357',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738848557092,
		size: 220,
		unparsedBytes: '',
		stateRoot: '5e6945b4a024d70609fe953c4489851f3b1fce18fddb8b0ae337b555b70a4fe519',
		height: 1455593,
		nBits: 117783533,
		version: 3,
		id: '33fc0503480ae017d712fc34b4efdc486d84966cc2688d44eafaeb6c8df859cb',
		adProofsRoot: '5ebc4bee67df85313e4e90b90c14ef8c3f55d0545004e520c0ccc645fc38de1c',
		transactionsRoot: 'bcca5095636c66314e622e3f75442dc48002858c424407c387b7d7a544444882',
		extensionHash: '8f253d1cbb6b0b5b6161083f42c5638d022fcb5cccb4aa6a0bf543b6c79d22c7',
		powSolutions: {
			pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: '5e24362c99383671',
			d: 0
		},
		adProofsId: '294972cb9d128714382a45e7f546f5f1bb64630e83cc6056bccf6b3064edbce8',
		transactionsId: '3857bbce01b166378c1b66e5400e171dcdfee2210741326164e8acc9a5853bb2',
		parentId: 'c3612bcf1dfcdd23a0e77b31a8d76bb1d96dc9524f5e8a6401b27d94b266738d'
	},
	{
		extensionId: '97bdb945eea1f9cd8d1315237880ffbaf374212a153c985bf6810e3710b9d637',
		difficulty: '1473263976841216',
		votes: '000000',
		timestamp: 1738848610149,
		size: 220,
		unparsedBytes: '',
		stateRoot: 'c5a72d5cc5f241dd55bce3a2abde03787d455fce77cce5e1c75b32e4487ca0c019',
		height: 1455594,
		nBits: 117783533,
		version: 3,
		id: 'ec66cb7f595742637fbac4ba35ebccc50022964d761c6c98d16bc6dd2f9ffae8',
		adProofsRoot: '7138b131f92df1ebbeb242d916c881eadf08c37c66b2e2333e3e00cb916db563',
		transactionsRoot: '915098e8bb43cc24a09f2c69c6f8f3d8d61c5205df3905424788b3881e835452',
		extensionHash: '8f253d1cbb6b0b5b6161083f42c5638d022fcb5cccb4aa6a0bf543b6c79d22c7',
		powSolutions: {
			pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: 'a08dc25e984f3611',
			d: 0
		},
		adProofsId: 'c798b962b45c3966267003c9d9c313546659607d98c00a8275d120bc83f0a3d2',
		transactionsId: 'd8988518c1d28379a640d3e7995a77adf8da3c8b86368b05e4f280314811c433',
		parentId: '33fc0503480ae017d712fc34b4efdc486d84966cc2688d44eafaeb6c8df859cb'
	},
	{
		extensionId: '0d496e0dc821848e463e703d78088de2482ae717c40b0b9c683237015b46baf9',
		difficulty: '1473263976841216',
		votes: '080000',
		timestamp: 1738848647130,
		size: 220,
		unparsedBytes: '',
		stateRoot: 'f70048ce6ed7ff99e63835c5d116907d419f70a37cb579ad622ee6b191b8d24b19',
		height: 1455595,
		nBits: 117783533,
		version: 3,
		id: '295a291fb0f0ba279984f8430f87654078f56087bca9219c79f9ccdf87aab055',
		adProofsRoot: 'f14b02fe90214be52c08b2c9f649e64bf032a18c602830770545667fd91cd1d8',
		transactionsRoot: '95ffa4e06dc51779d629df2ba55473f24f530e7bcaf0e1f6fe144aa48d8b793f',
		extensionHash: '8f253d1cbb6b0b5b6161083f42c5638d022fcb5cccb4aa6a0bf543b6c79d22c7',
		powSolutions: {
			pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
			w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			n: 'a45a4ac0a09fc953',
			d: 0
		},
		adProofsId: '44b67b78d161b8d8aab0ec27c836b1bd259eec4b937bb97fa733cbafeca05972',
		transactionsId: '558526e17c39ab698caed18f4d9daf435aa3259c4b7b8941187afeb6ede9d4c8',
		parentId: 'ec66cb7f595742637fbac4ba35ebccc50022964d761c6c98d16bc6dd2f9ffae8'
	}
];
