// https://github.com/kushti/dexy-stable/blob/master/src/main/scala/dexy/chainutils/DexySpec.scala

import { ErgoAddress } from '@fleet-sdk/core';
import {
	DEXY_BANK_ARBMINT,
	DEXY_BANK_BANK,
	DEXY_BANK_BUYBACK,
	DEXY_BANK_FREEMINT,
	DEXY_BANK_INTERVENTION,
	DEXY_BANK_PAYOUT,
	DEXY_BANK_UPDATE_BALLOT,
	DEXY_BANK_UPDATE_UPDATE,
	DEXY_BANK_UPDATE_UPDATE_EXTRACT,
	DEXY_BANK_UPDATE_UPDATE_INTERVENTION,
	DEXY_GORT_DEV_EMISSION,
	DEXY_LP_POOL_EXTRACT,
	DEXY_LP_POOL_MAIN,
	DEXY_LP_POOL_MINT,
	DEXY_LP_POOL_REDEEM,
	DEXY_LP_POOL_SWAP,
	DEXY_LP_PROXY_SWAPBUYV1,
	DEXY_LP_PROXY_SWAPSELLV1,
	DEXY_TRACKING
} from './dexyAddressConstants';
import { compileContract } from './compile';

export interface NetworkTokenIds {
	lpNFT: string;
	lpSwapNFT: string;
	lpMintNFT: string;
	lpRedeemNFT: string;
	lpTokenId: string;
	lpToken: string;
	tracking95NFT: string;
	tracking98NFT: string;
	tracking101NFT: string;
	bankNFT: string;
	updateNFT: string;
	ballotTokenId: string;
	interventionNFT: string;
	extractionNFT: string;
	arbitrageMintNFT: string;
	freeMintNFT: string;
	payoutNFT: string;
	dexyTokenId: string;
	dexyUSD: string;
}

export interface MainnetTokenIds extends NetworkTokenIds {
	gort: string;
	gortId: string;
	oracleTokenId: string;
	oraclePoolNFT: string;
	oracleNFT: string;
	gortDevEmissionNFT: string;
	gortLpNFT: string;
	buybackNFT: string;
}

//ADDRESSES
const DEXY_TRACKING_ADDRESS = DEXY_TRACKING;

const DEXY_BANK_UPDATE_ADDRESS = DEXY_BANK_UPDATE_UPDATE; // update.es + bankNFT
const DEXY_BANK_EXTRACT_UPDATE_ADDRESS = DEXY_BANK_UPDATE_UPDATE_EXTRACT; // update.es + interventionNFT
const DEXY_BANK_INTERVENTION_UPDATE_ADDRESS = DEXY_BANK_UPDATE_UPDATE_INTERVENTION; // update.es + interventionNFT

const DEXY_BANK_BALLOT_ADDRESS = DEXY_BANK_UPDATE_BALLOT;
const DEXY_BANK_INTERVENTION_ADDRESS = DEXY_BANK_INTERVENTION;
const DEXY_BANK_BUYBACK_ADDRESS = DEXY_BANK_BUYBACK;
const DEXY_BANK_PAYOUT_ADDRESS = DEXY_BANK_PAYOUT;
const DEXY_BANK_FREEMINT_ADDRESS = DEXY_BANK_FREEMINT;
const DEXY_BANK_ADDRESS = DEXY_BANK_BANK;
const DEXY_BANK_ARBMINT_ADDRESS = DEXY_BANK_ARBMINT;
const DEXY_LP_PROXY_SWAPBUYV1_ADDRESS = DEXY_LP_PROXY_SWAPBUYV1;
const DEXY_LP_PROXY_SWAPSELLV1_ADDRESS = DEXY_LP_PROXY_SWAPSELLV1;
const DEXY_LP_ADDRESS = DEXY_LP_POOL_MAIN;
const DEXY_LP_EXTRACT_ADDRESS = DEXY_LP_POOL_EXTRACT;
const DEXY_LP_MINT_ADDRESS = DEXY_LP_POOL_MINT;
const DEXY_LP_SWAP_ADDRESS = DEXY_LP_POOL_SWAP;
const DEXY_LP_REDEEM_ADDRESS = DEXY_LP_POOL_REDEEM;
const DEXY_GORT_DEV_EMISSION_ADDRESS = DEXY_GORT_DEV_EMISSION;

//TREES
const DEXY_TRACKING_TREE = tree(DEXY_TRACKING_ADDRESS);

const DEXY_BANK_UPDATE_TREE = tree(DEXY_BANK_UPDATE_ADDRESS); // update.es + bankNFT
const DEXY_BANK_INTERVENTION_UPDATE_TREE = tree(DEXY_BANK_INTERVENTION_UPDATE_ADDRESS); // update.es + interventionNFT
const DEXY_BANK_EXTRACT_UPDATE_TREE = tree(DEXY_BANK_EXTRACT_UPDATE_ADDRESS); // update.es + extractionNFT

const DEXY_BANK_BALLOT_TREE = tree(DEXY_BANK_BALLOT_ADDRESS);
const DEXY_BANK_INTERVENTION_TREE = tree(DEXY_BANK_INTERVENTION_ADDRESS);
const DEXY_BANK_BUYBACK_TREE = tree(DEXY_BANK_BUYBACK_ADDRESS);
const DEXY_BANK_PAYOUT_TREE = tree(DEXY_BANK_PAYOUT_ADDRESS);
const DEXY_BANK_FREEMINT_TREE = tree(DEXY_BANK_FREEMINT_ADDRESS);
const DEXY_BANK_TREE = tree(DEXY_BANK_ADDRESS);
const DEXY_BANK_ARBMINT_TREE = tree(DEXY_BANK_ARBMINT_ADDRESS);
const DEXY_LP_PROXY_SWAPBUYV1_TREE = tree(DEXY_LP_PROXY_SWAPBUYV1_ADDRESS);
const DEXY_LP_PROXY_SWAPSELLV1_TREE = tree(DEXY_LP_PROXY_SWAPSELLV1_ADDRESS);
const DEXY_LP_TREE = tree(DEXY_LP_ADDRESS);
const DEXY_LP_EXTRACT_TREE = tree(DEXY_LP_EXTRACT_ADDRESS);
const DEXY_LP_MINT_TREE = tree(DEXY_LP_MINT_ADDRESS);
const DEXY_LP_SWAP_TREE = tree(DEXY_LP_SWAP_ADDRESS);
const DEXY_LP_REDEEM_TREE = tree(DEXY_LP_REDEEM_ADDRESS);
const DEXY_GORT_DEV_EMISSION_TREE = tree(DEXY_GORT_DEV_EMISSION_ADDRESS);

export const vitestErgoTrees = {
	trackingErgoTree: DEXY_TRACKING_TREE,
	bankUpdateErgoTree: DEXY_BANK_UPDATE_TREE,
	ballotErgoTree: DEXY_BANK_BALLOT_TREE,
	interventionErgoTree: DEXY_BANK_INTERVENTION_TREE,
	interventionUpdateErgoTree: DEXY_BANK_INTERVENTION_UPDATE_TREE,
	buybackErgoTree: DEXY_BANK_BUYBACK_TREE,
	payoutErgoTree: DEXY_BANK_PAYOUT_TREE,
	freeMintErgoTree: DEXY_BANK_FREEMINT_TREE,
	bankErgoTree: DEXY_BANK_TREE,
	arbitrageMintErgoTree: DEXY_BANK_ARBMINT_TREE,
	lpErgoTree: DEXY_LP_TREE,
	lpMintErgoTree: DEXY_LP_MINT_TREE,
	lpRedeemErgoTree: DEXY_LP_REDEEM_TREE,
	//:DEXY_LP_POOL_EXTRACT,
	//:DEXY_LP_POOL_MINT,
	swapErgoTree: DEXY_LP_SWAP_TREE,
	//:DEXY_LP_POOL_REDEEM,
	//:DEXY_GORT_DEV_EMISSION,
	lpSwapBuyV1ErgoTree: DEXY_LP_PROXY_SWAPBUYV1_TREE,
	lpSwapSellV1ErgoTree: DEXY_LP_PROXY_SWAPSELLV1_TREE,
	oracleErgoTree: tree(compileContract('sigmaProp(true)')), //<-----
	fakeScriptErgoTree: tree(compileContract('sigmaProp(true)'))
};

//-----------------------------------

export const testTokenIds: any = {
	// oracle related tokens
	gort: '4e8f38135867f99f064e3dbac43a1402e830cd768bcb73e6c8e205b166ba9ec5',
	// gort == gortId
	gortId: '4e8f38135867f99f064e3dbac43a1402e830cd768bcb73e6c8e205b166ba9ec5',
	oracleTokenId: '3809ed2b41d5868307be9b77523861cfd332445596a238cad0c780ccc9b215ea',
	oraclePoolNFT: 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011',
	// oracleNFT == oraclePoolNFT
	oracleNFT: 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011',

	gortDevEmissionNFT: '47db2393c6f6210b9d7e655eabb2ced8aa9830457d69f3290732b804a363085b',
	gortLpNFT: 'e952616014257d62dd52edf006413783aa93d6107413248ff35f094214cc3b39',
	buybackNFT: '109dfaf60489985fc43fbbf3a49cc2f41eedc33f7b01370122c69cf4aeb58272',

	// overridden tokens
	lpNFT: '323bf7f5cfcc33f3e4f1bd559113e46592139835b64bfe02aa810658980cb50c',
	lpSwapNFT: 'd69fb6bea54006a0f4cc5f54486bf431e6083ee736176a02522b5b87d6dc9678',
	lpMintNFT: '27521c68cbf6863bf2e6a087495d2b6794db36303e18dfac68e1d9e1824931de',
	lpRedeemNFT: '3d8743ba7060ccd0a3437bbe0c3d9a2ff16d1ac66ff08af220e053b7dd77d8d4',
	lpTokenId: '23b682cde32b4d0e8492caa472b526f8419f7181363534e0cbab92b3c5d452d4',
	tracking95NFT: 'ace8dde0c7b911e633533d358451721526a3f54a65f824d1428eb2c710b297e4',
	tracking98NFT: '887db49191ab0d0ef290668d78e9ddc3604cc04921e119d7049c26fd9059d6b6',
	tracking101NFT: '88d88a89fa13be6f048bbe68195696573dc9e584d34190d37a7ece7189b8580d',
	bankNFT: 'a033c16089312f77d7724ae6fd22ff5f2524a7d684fdd2f6f3f94132bbb30784',
	updateNFT: 'da098134180c2391b108e7b9ec5727fa644daced2d4b0b3b9196d94c0fa57ace',
	ballotTokenId: 'a662b14dcabc8dddc93bafe77de53adffdb8fb3dcf81d7be899dd383e46fffa1',
	interventionNFT: '7db50c9a8b13fb02e9a330c0bef6f75a7e2cd8df312962ca10b7bc3169ce75d6',
	extractionNFT: 'e670ada0f96aab06aae481986182dbb0d351c6ae0e1ca65b47ef6bea7a69f6fb',
	arbitrageMintNFT: 'a2e14bbfff15a86959862f351a03c84cb49cd078bbbfb27f95424ed4eba5dbb0',
	freeMintNFT: '9fe049100ef4e4514c8dfe7b08d28e95e0dcdb267184bf4d6c6cf460e16c81d4',
	payoutNFT: 'b667ad04ff28c0a5af15bb7c453cfb10d531c8556e229617d6bda28309e2e0cd',
	dexyTokenId: 'f679b3efbcd969c3f9699013e33169966211ac409a250332ca3dcb6694a512ed'
};

export const initialTokenAmount: any = {
	//oracle related tokens
	gort: 100_000n, // <-------------- CANT FIND
	//gort == gortId
	gortId: 100_000n, // <-------------- CANT FIND
	oracleTokenId: 35n,
	oraclePoolNFT: 1n,
	//oracleNFT == oraclePoolNFT
	oracleNFT: 1n,
	gortDevEmissionNFT: 1n,
	gortLpNFT: 1n,
	buybackNFT: 1n,

	// overridden tokens
	lpNFT: 1n,
	lpSwapNFT: 1n,
	lpMintNFT: 1n,
	lpRedeemNFT: 1n,
	lpTokenId: 100_000_000_000n,
	tracking95NFT: 1n,
	tracking98NFT: 1n,
	tracking101NFT: 1n,
	bankNFT: 1n,
	updateNFT: 1n,
	ballotTokenId: 5n, // // <-------------- NEED CHECK
	interventionNFT: 1n,
	extractionNFT: 1n,
	arbitrageMintNFT: 1n,
	freeMintNFT: 1n,
	payoutNFT: 1n,
	dexyTokenId: 10_000_000_000_000n
};

export const mainnetTokenIds: MainnetTokenIds = {
	// oracle related tokens
	gort: '7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9',
	// gort == gortId
	gortId: '7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9',
	oracleTokenId: '6183680b1c4caaf8ede8c60dc5128e38417bc5b656321388b22baa43a9d150c2',
	oraclePoolNFT: '3c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a',
	// oracleNFT == oraclePoolNFT
	oracleNFT: '3c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a',
	gortDevEmissionNFT: 'bb484bb7fea08b15861e27cb203a13069082befb05f5437cae71237d9c5c6ac3',
	gortLpNFT: 'd1c9e20657b4e37de3cd279a994266db34b18e6e786371832ad014fd46583198',
	buybackNFT: 'bf24ed4af7eb5a7839c43aa6b240697d81b196120c837e1a941832c266d3755c',

	// overridden tokens
	lpNFT: '905ecdef97381b92c2f0ea9b516f312bfb18082c61b24b40affa6a55555c77c7',
	lpSwapNFT: 'c9f1304c58a1b789c0c5b4c601fa12acde1188fdff245d72bdc549c9296d2aa4',
	lpMintNFT: '19b8281b141d19c5b3843a4a77e616d6df05f601e5908159b1eaf3d9da20e664',
	lpRedeemNFT: '08c47eef5e782f146cae5e8cfb5e9d26b18442f82f3c5808b1563b6e3b23f729',
	lpTokenId: '376603b9ecbb953202fbac977f418ab5edc9d9effafbbe1418f5aece661dfa1f',
	// lpToken == lpTokenId
	lpToken: '376603b9ecbb953202fbac977f418ab5edc9d9effafbbe1418f5aece661dfa1f',
	tracking95NFT: '4819812cd232de35f9e711f0006953df3770649bd33a5a67d9d8634ec3184bba',
	tracking98NFT: '17d3e6ccd55b16547143d51b91331c01ea9f89b0841ff2948dd2a164276621a8',
	tracking101NFT: '31bf6b4ee0bb108e155040dc93927dacef8f7af858be1ec53f232131be20e66f',
	bankNFT: '75d7bfbfa6d165bfda1bad3e3fda891e67ccdcfc7b4410c1790923de2ccc9f7f',
	updateNFT: '7a776cf75b8b3a5aac50a36c41531a4d6f1e469d2cbcaa5795a4f5b4c255bf09',
	ballotTokenId: '3277be793f89bd88706938dd09ad49afe29a62b67b596d54a5fd7e06bf8e71ce',
	interventionNFT: '6597acef421c21a6468a2b58017df6577b23f00099d9e0772c0608deabdf6d13',
	extractionNFT: '615be55206b1fea6d7d6828c1874621d5a6eb0e318f98a4e08c94a786f947cec',
	arbitrageMintNFT: 'c28c5104a4ceb13f9e6ca18f312d3e5d543e64a94eb2e4333e4d6c2f0590042a',
	freeMintNFT: '2010eedd38b6ebe3bcd703ec9649b114ef3f2b2142aec873eded3e67f25a19c5',
	payoutNFT: '1d88e849dc537081470b273f37c2118d73a418f8c4d0c9117dcf044dde82f5b2',
	dexyTokenId: '6122f7289e7bb2df2de273e09d4b2756cda6aeb0f40438dc9d257688f45183ad',
	// dexyTokenId == dexyUSD
	dexyUSD: '6122f7289e7bb2df2de273e09d4b2756cda6aeb0f40438dc9d257688f45183ad'
};

// const adresses[7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9] = addr
// const ergoTree[7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9] = tree

export const contractConfig = {
	initialDexyTokens: '10000000000000L',
	feeNumLp: '997L',
	feeDenomLp: '1000L',
	initialLp: '100000000000L',
	intMax: '2147483647',
	epochLength: '30',
	intZero: '0', //??
	longZero: '0' //??
	//LP dep lpToken: ${initialLp - 6400000000L}
};

export const dexyAddresses = {
	interventionAddress: DEXY_BANK_INTERVENTION_ADDRESS,
	interventionUpdateAddress: DEXY_BANK_INTERVENTION_UPDATE_ADDRESS,
	extractUpdateAddress: DEXY_BANK_EXTRACT_UPDATE_ADDRESS
};

export const dexyGold = { ...mainnetTokenIds, ...contractConfig, ...dexyAddresses };

// contract compilation variables
function convertHexToBase64(obj: Object) {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [key, Buffer.from(value, 'hex').toString('base64')])
	);
}

function sortKeysByLength(obj: Object) {
	return Object.fromEntries(
		Object.entries(obj).sort(([keyA], [keyB]) => keyB.length - keyA.length)
	);
}

export const contractCompileVariables = sortKeysByLength({
	...convertHexToBase64(mainnetTokenIds),
	...contractConfig
});

// vitest helpers

export const vitestContractConfig = scalaToJsNumbers(contractConfig);

function scalaToJsNumbers(o: Object) {
	return Object.fromEntries(
		Object.entries(o).map(([key, value]) => {
			if (typeof value === 'string') {
				if (value.endsWith('L')) {
					return [key, BigInt(value.slice(0, -1))];
				}
				return [key, BigInt(value)];
			} else if (typeof value === 'number') {
				return [key, BigInt(value)];
			}
			return [key, value];
		})
	);
}

export const vitestTokenIds = mainnetTokenIds;
export const vitestAddresses = dexyAddresses;

function tree(address: string): string {
	return address ? ErgoAddress.fromBase58(address).ergoTree : '';
}
