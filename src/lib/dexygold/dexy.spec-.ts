import { describe, it, expect } from 'vitest';
import { compileContract } from './compile';
import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder } from '@fleet-sdk/core';
import { ALICE_MNEMONIC, BOB_MNEMONIC } from '../private/mnemonics';
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
	it('complie redeem LP contract', () => {
		//Both Oracle ...
		const redeemAddress = compileContract(redeemContract);
		expect(redeemAddress).toBe(dexyRedeemAddress);
	});
	it('take box from contract', async () => {
		const unsigned = buildTx();
		const signed = await signTx(unsigned, BOB_MNEMONIC);
		console.dir(JSON.stringify(signed), { depth: null });
		expect(signed).toBeTruthy();
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
		.withDataFrom(potentialDataInputBox)
		.from(inputBox)
		.to(output)
		.sendChangeTo(BOB_ADDRESS)
		.payFee(RECOMMENDED_MIN_FEE_VALUE)
		.build()
		.toEIP12Object();

	return unsignedTx;
}

function tokenIdToBase64(tokenId: string) {
	return Buffer.from(tokenId, 'hex').toString('base64');
}

//const $interventionNFT = tokenIdToBase64(interventionNFT);
//const $extractionNFT = tokenIdToBase64(extractionNFT);
//const $lpSwapNFT = tokenIdToBase64(lpSwapNFT);
//const $lpMintNFT = tokenIdToBase64(lpMintNFT);
//const $lpRedeemNFT = tokenIdToBase64(lpRedeemNFT);

// const LP_SCRIPT = `{
//     // Liquidity pool script
//     // Unlike ErgoDex (Spectrum) scripts, we split the script into many action scripts, like done with the bank script
//     //
//     // Other differences from original Spectrum's script are:
//     //  * 2% redemption fee
//     //  * redemption is inactive when LP price is < 0.98 * oracle price
//     //  * additional intervention action (where bank interacts with LP), defined in bank/intervention.es
//     //  * additional extract-to-the-future and release-extracted-tokens actions (extract.es)
//     //
//     // This box: (LP box)
//     //
//     // TOKENS
//     //   Tokens(0): NFT to uniquely identify LP box.
//     //   Tokens(1): LP tokens
//     //   Tokens(2): Y tokens, the Dexy tokens (Note that X tokens are NanoErgs (the value)
//     //
//     // TRANSACTIONS
//     //
//     // [1] Intervention
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |   Oracle
//     // 1 Bank          |  Bank          |
//     // 2 Intervention  |  Intervention  |
//     //
//     // [2] Swap
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |
//     // 1 Swap          |  Swap          |
//     //
//     // [3] Redeem LP tokens
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |   Oracle
//     // 1 Redeem        |  Redeem
//     //
//     // [4] Mint LP tokens
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |
//     // 1 Mint          |  Mint
//     //
//     // [5] Extract to future
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |   Oracle
//     // 1 Extract       |  Extract       |   Bank
//     // 2               |                |   Tracking (95%)
//     //
//     // [6] Release extracted to future tokens
//     //   Input         |  Output        |   Data-Input
//     // -----------------------------------------------
//     // 0 LP            |  LP            |   Oracle
//     // 1 Extract       |  Extract       |   Tracking (101%)
//     //
//     // -------------------------------------------------------------
//     // Notation:
//     //
//     // X is the primary token
//     // Y is the secondary token
//     // In DexyUSD, X is NanoErg and Y is USD

//     // inputs
//     val interventionBoxIndex = 2
//     val extractBoxIndex = 1
//     val lpActionBoxIndex = 1 // swap/redeem/mint

//     // outputs
//     val selfOutIndex = 0

//     val interventionNFT = fromBase64("${$interventionNFT}")
//     val extractionNFT = fromBase64("${$extractionNFT}")
//     val swapNFT = fromBase64("${$lpSwapNFT}")
//     val mintNFT = fromBase64("${$lpMintNFT}")
//     val redeemNFT = fromBase64("${$lpRedeemNFT}")

//     val interventionBox = INPUTS(interventionBoxIndex)
//     val extractBox = INPUTS(extractBoxIndex)
//     val swapBox = INPUTS(lpActionBoxIndex)
//     val mintBox = INPUTS(lpActionBoxIndex)
//     val redeemBox = INPUTS(lpActionBoxIndex)

//     val successor = OUTPUTS(selfOutIndex) // copy of this box after exchange

//     val validSwap      = swapBox.tokens(0)._1 == swapNFT
//     val validMint      = mintBox.tokens(0)._1 == mintNFT
//     val validRedeem    = redeemBox.tokens(0)._1 == redeemNFT

//     val validIntervention = interventionBox.tokens.size > 0 && interventionBox.tokens(0)._1 == interventionNFT
//     val validExtraction   = extractBox.tokens(0)._1 == extractionNFT

//     val lpNftIn      = SELF.tokens(0)
//     val lpReservesIn = SELF.tokens(1)
//     val tokenYIn     = SELF.tokens(2)

//     val lpNftOut      = successor.tokens(0)
//     val lpReservesOut = successor.tokens(1)
//     val tokenYOut     = successor.tokens(2)

//     val preservedScript      = successor.propositionBytes == SELF.propositionBytes
//     val preservedLpNft       = lpNftIn == lpNftOut
//     val preservedLpTokenId   = lpReservesOut._1 == lpReservesIn._1
//     val preservedDexyTokenId = tokenYOut._1 == tokenYIn._1

//     // Note:
//     //    supplyLpIn = initialLp - lpReservesIn._2
//     //    supplyLpOut = initialLp - lpReservesOut._2
//     // Thus:
//     //    deltaSupplyLp = supplyLpOut - supplyLpIn
//     //                  = (initialLp - lpReservesOut._2) - (initialLp - lpReservesIn._2)
//     //                  = lpReservesIn._2 - lpReservesOut._2

//     val deltaSupplyLp  = lpReservesIn._2 - lpReservesOut._2

//     // since tokens can be repeated, we ensure for sanity that there are no more tokens
//     val noMoreTokens         = successor.tokens.size == 3

//     val lpAction = validSwap || validMint || validRedeem

//     val dexyAction = (validIntervention || validExtraction) &&
//                       deltaSupplyLp == 0 // ensure Lp tokens are not extracted during dexyAction
//     sigmaProp(
//         preservedScript           &&
//         preservedLpNft            &&
//         preservedLpTokenId        &&
//         preservedDexyTokenId      &&
//         noMoreTokens              &&
//         (lpAction || dexyAction)
//     )
// }`;

const oracleTokenId = '6183680b1c4caaf8ede8c60dc5128e38417bc5b656321388b22baa43a9d150c2'; //GOLD Oracle Reward Token ID
const oracleNFT = '3c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a'; //GOLD Oracle Mainnet NFT
const oracleNFT_USD = '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f'; // USD

const $oracleNFT = Buffer.from(oracleNFT, 'hex').toString('base64');
const $initialLp = '100000000000L'; // 100000000000

const dexyRedeemErgoTree =
	'1013040004020400040204040404060164060162040004020500050005000580a0b787e90504000e203c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a0580897a05c40105c801d80ed601b2a4730000d602db63087201d6038cb2720273010002d604b2a5730200d605db63087204d6069972038cb2720573030002d607c17201d60899c172047207d6098cb2720273040002d60a998cb27205730500027209d60b7306d60c7307d60db2db6501fe730800d60eb2a5730900d1ededededed8f7206730a8f7208730b8f720a730cd802d60f7e99730d720306d6107e720606ed929d9c9c7e720806720f720b720c9c72107e720706929d9c9c7e720a06720f720b720c9c72107e720906ed938cb2db6308720d730e0001730f919d720772099d9c9de4c6720d0405731073117312eded93c2720ec2a792c1720ec1a793db6308720edb6308a7';
const dexyRedeemAddress =
	'4qCVUToafqBhtiuhyUEYCwaLpetzDcqE32nATDitdQ8fqBKKNL4u7TcobWaGuvRBw7bZXep3Z1L7NhmficeDTaPpyhBPLbyJYbMxymZK2drZobFhmH1a2cwBeEeN7GhUDJ1EY14scAK37G9utbmUCZGfj8t4DHkK2bnSyqZyLLRmVwUSpC8DHtG17iXcCuoXHByatcNQ1SbhMfz33bnFcESwfj4poaWjoaZGiyT86xAV3QqroVi1hHeBsjkCBR7g68A9dceyvgqbcF1ouyURDXpjAP44UC5J6NpUeA8yKbskaYe1xud7tA4ojsGeiv4oAUcBRAKc6435x2E1UvzYasA8WuyLRAXoq8CgJe7Lc2NxKkGRDumEJKz7VECijkPRByF7nTq256jwEviTcZ8RzAt9qyj8rMKo7Bzy22CSvrDAfiXtVDzherZmEKij6jeECMqPq88eVmXyB9qaGmAT';

let redeemContract = `{
  // LP subcontract for redeeming LP tokens action.
  //
  // This box: (LP Redeem box)
  //
  // TOKENS
  //   Tokens(0): NFT to uniquely identify this box

  val initialLp = ${$initialLp}   // How many LP initially minted. Used to compute Lp in circulation (supply Lp).
  // Note that at bootstrap, we may have initialLp > tokens stored in LP box quantity to consider the initial token burning in UniSwap v2

  val lpBoxInIndex = 0 // input
  val oracleBoxIndex = 0 // data input
  val lpBoxOutIndex = 0 // output
  val selfOutIndex = 1 // output

  val oracleNFT = fromBase64("${$oracleNFT}") // to identify oracle pool box

  val lpBoxIn = INPUTS(lpBoxInIndex)

  val oracleBox = CONTEXT.dataInputs(oracleBoxIndex)
  val lpBoxOut = OUTPUTS(lpBoxOutIndex)
  val successor = OUTPUTS(selfOutIndex)

  val lpReservesIn = lpBoxIn.tokens(1)
  val lpReservesOut = lpBoxOut.tokens(1)

  val reservesXIn = lpBoxIn.value
  val reservesYIn = lpBoxIn.tokens(2)._2

  val reservesXOut = lpBoxOut.value
  val reservesYOut = lpBoxOut.tokens(2)._2

  // circulating supply of LP tokens
  val supplyLpIn = initialLp - lpReservesIn._2

  // oracle delivers nanoErgs per 1 kg of gold
  // we divide it by 1000000 to get nanoErg per dexy, i.e. 1mg of gold
  // can assume always > 0 (ref oracle pool contracts) NanoErgs per USD
  val oracleRateXy = oracleBox.R4[Long].get / 1000000L
  val lpRateXyIn = reservesXIn / reservesYIn  // we can assume that reservesYIn > 0 (since at least one token must exist)

  val validOracleBox = oracleBox.tokens(0)._1 == oracleNFT

  val validRateForRedeemingLp = validOracleBox && lpRateXyIn > oracleRateXy * 98 / 100 // lpRate must be >= 0.98 * oracleRate // these parameters need to be tweaked

  // Note:
  //    supplyLpIn = initialLp - lpReservesIn._2
  //    supplyLpOut = initialLp - lpReservesOut._2
  // Thus:
  //    deltaSupplyLp = supplyLpOut - supplyLpIn
  //                  = (initialLp - lpReservesOut._2) - (initialLp - lpReservesIn._2)
  //                  = lpReservesIn._2 - lpReservesOut._2

  val deltaSupplyLp  = lpReservesIn._2 - lpReservesOut._2
  val deltaReservesX = reservesXOut - reservesXIn
  val deltaReservesY = reservesYOut - reservesYIn

  val validRedemption = deltaSupplyLp < 0 && deltaReservesX < 0 && deltaReservesY < 0 && {
      val _deltaSupplyLp = deltaSupplyLp.toBigInt
      // note: _deltaSupplyLp, deltaReservesX and deltaReservesY are negative
      // 2% fee
      deltaReservesX.toBigInt * supplyLpIn * 100 / 98 >= _deltaSupplyLp * reservesXIn &&
          deltaReservesY.toBigInt * supplyLpIn * 100 / 98 >= _deltaSupplyLp * reservesYIn
  } && validRateForRedeemingLp

  val selfPreserved = successor.propositionBytes == SELF.propositionBytes  &&
                      successor.value >= SELF.value                        &&
                      successor.tokens == SELF.tokens

  sigmaProp(validRedemption && selfPreserved)
}`;
