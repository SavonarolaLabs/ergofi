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
	extractScriptErgoTree: DEXY_LP_EXTRACT_TREE,
	extractUpdateErgoTree: DEXY_BANK_EXTRACT_UPDATE_TREE,
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

const testTokenIds: any = {
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
	//intMaxHex: '04feffffffffffffffff01',
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

export const testBoxes: any = {
	// oracle related tokens
	gort: {
		globalIndex: 45787879,
		inclusionHeight: 1443467,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '49609058ac466b55038dc1d78c683a4553a491523f6802960ecd6dea0e8603fc',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '4e8f38135867f99f064e3dbac43a1402e830cd768bcb73e6c8e205b166ba9ec5',
				amount: 100000
			}
		],
		creationHeight: 1443463,
		additionalRegisters: {
			R4: '0e09676f72742054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
		index: 1
	},
	// gort == gortId
	gortId: {
		globalIndex: 45787879,
		inclusionHeight: 1443467,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '49609058ac466b55038dc1d78c683a4553a491523f6802960ecd6dea0e8603fc',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '4e8f38135867f99f064e3dbac43a1402e830cd768bcb73e6c8e205b166ba9ec5',
				amount: 100000
			}
		],
		creationHeight: 1443463,
		additionalRegisters: {
			R4: '0e09676f72742054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '180a362bee63b7a36aad554493df07fe9abe59dc53e1a6266f6584e49e470e3c',
		index: 1
	},
	oracleTokenId: {
		globalIndex: 45787325,
		inclusionHeight: 1443448,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '6dc255ed51c6daf9f618fe98cfb78a5ca027db0f58fc02d5d358fd4509db3d94',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '3809ed2b41d5868307be9b77523861cfd332445596a238cad0c780ccc9b215ea',
				amount: 35
			}
		],
		creationHeight: 1443446,
		additionalRegisters: {
			R4: '0e106f7261636c65546f6b656e2054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '1902e27a4253371aa0b9042c153cd3546a145ca9d0781f18300a3f3b39151481',
		index: 1
	},
	oraclePoolNFT: {
		globalIndex: 45787364,
		inclusionHeight: 1443450,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'ecee8bd1431801565e99dc7ddc4b6a27ae3e60ad765de14b7bfc7e4a88b33bf7',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011',
				amount: 1
			}
		],
		creationHeight: 1443448,
		additionalRegisters: {
			R4: '0e126f7261636c65506f6f6c4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'a9201c896e029d61d81334d4af575d985c4682d6fbd430515e26c7160c3c1b87',
		index: 1
	},
	// oracleNFT == oraclePoolNFT
	oracleNFT: {
		globalIndex: 45787364,
		inclusionHeight: 1443450,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'ecee8bd1431801565e99dc7ddc4b6a27ae3e60ad765de14b7bfc7e4a88b33bf7',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011',
				amount: 1
			}
		],
		creationHeight: 1443448,
		additionalRegisters: {
			R4: '0e126f7261636c65506f6f6c4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'a9201c896e029d61d81334d4af575d985c4682d6fbd430515e26c7160c3c1b87',
		index: 1
	},
	gortDevEmissionNFT: {
		globalIndex: 45787367,
		inclusionHeight: 1443450,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '2cb6a949c65d2ae808ba90f0b3781ae8aeeb74ea1a4d7bde00ed6a6bcfdcfb00',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '47db2393c6f6210b9d7e655eabb2ced8aa9830457d69f3290732b804a363085b',
				amount: 1
			}
		],
		creationHeight: 1443448,
		additionalRegisters: {
			R4: '0e17676f7274446576456d697373696f6e4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '1c3b8c8740a26fa920b12917b6834c216304b440054162137a14da2551951251',
		index: 1
	},
	gortLpNFT: {
		globalIndex: 45787372,
		inclusionHeight: 1443450,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '1ab9b3935678d3be385f4b2c5b73c61f129616399e9a2d55e2d0a31d01216a9a',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'e952616014257d62dd52edf006413783aa93d6107413248ff35f094214cc3b39',
				amount: 1
			}
		],
		creationHeight: 1443448,
		additionalRegisters: {
			R4: '0e0e676f72744c704e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '53b76745da21f52eb1f3eb0d414cbea3804973821f014e03708f7961704917e6',
		index: 1
	},
	buybackNFT: {
		globalIndex: 45787405,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '29dceb1e86412c6a917934c3dcf9e898a32b5a3ee7febf97a1dbbd5aeab33079',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '109dfaf60489985fc43fbbf3a49cc2f41eedc33f7b01370122c69cf4aeb58272',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0f6275796261636b4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'cbec67778e0463682b4eca2897ca8554c6e76e6f31b43e7b9aff162558db6068',
		index: 1
	},
	// overridden tokens
	lpNFT: {
		globalIndex: 45787408,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '3c7fddff0b320f23bf1060b55a071ff6ad1cddc148bfafa38a79579a33f0c15a',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '323bf7f5cfcc33f3e4f1bd559113e46592139835b64bfe02aa810658980cb50c',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0a6c704e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '2819c8e7558f6e4bbe09c961631a5c065fe3e005750d2ad45fdee91c71969072',
		index: 1
	},
	lpSwapNFT: {
		globalIndex: 45787411,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '269ccabcb814388d9c3ec7f932081aa4e649e46ca41934db2887700d83c8b98c',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'd69fb6bea54006a0f4cc5f54486bf431e6083ee736176a02522b5b87d6dc9678',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0e6c70537761704e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'd70165bb00e377ea66db5d13167b7250ea069c52fd406fa60b0d75a796a50023',
		index: 1
	},
	lpMintNFT: {
		globalIndex: 45787414,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '5992eeb61796b34e7d8b73367e65d5ac6584311cf4a7638371d1c8619352e66a',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '27521c68cbf6863bf2e6a087495d2b6794db36303e18dfac68e1d9e1824931de',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0e6c704d696e744e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '7f850a3a16933bdf9fedcce88917c125c619a9d038be356c2d5c5330aa27d630',
		index: 1
	},
	lpRedeemNFT: {
		globalIndex: 45787417,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'eb03bf1c132f52406b605097d00d346574ef01e3edba13c8290aa11502344195',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '3d8743ba7060ccd0a3437bbe0c3d9a2ff16d1ac66ff08af220e053b7dd77d8d4',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e106c7052656465656d4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '0216a669ffa975592968f211c1493faa8b5f69c2773b467105ecbde992537051',
		index: 1
	},
	lpTokenId: {
		globalIndex: 45787420,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '6246c398da67355b45597c6ef1f818c68c0b944ec6bd024494c751851748d3fb',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '23b682cde32b4d0e8492caa472b526f8419f7181363534e0cbab92b3c5d452d4',
				amount: 100000000000
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0e6c70546f6b656e49642054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '7000879348d1dcdb298299c17bbf1d2b2a98ab2f8e16d35ad07c03ce8c6e24e0',
		index: 1
	},
	tracking95NFT: {
		globalIndex: 45787423,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '2e5534bdcc46150a42a8228347a8a4faa787778a3b0cffac3ecfb250cdb7e50b',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'ace8dde0c7b911e633533d358451721526a3f54a65f824d1428eb2c710b297e4',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e12747261636b696e6739354e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'a21f5f10aa7139a48234abada4f51a0fa46ba1654f2ab30051be3532c9135a1e',
		index: 1
	},
	tracking98NFT: {
		globalIndex: 45787426,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '61f8b4137f2ae7fcaaba4c13462ec8c7638bc05755043860ac43710704664b91',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '887db49191ab0d0ef290668d78e9ddc3604cc04921e119d7049c26fd9059d6b6',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e12747261636b696e6739384e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '794654741e431231b7ab4e8c879eabbe2dc0b5d3db0f6c68a511d4dc683f57b6',
		index: 1
	},
	tracking101NFT: {
		globalIndex: 45787429,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '8999ac576a260bf8c004861f937f9754a3edf3d2cdffa72e16c4050c8e9aa66e',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '88d88a89fa13be6f048bbe68195696573dc9e584d34190d37a7ece7189b8580d',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e13747261636b696e673130314e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'a3b19eecc5f295ff70e59b41c7ce0a414c197ef8c4be680ed83a8eec55be971c',
		index: 1
	},
	bankNFT: {
		globalIndex: 45787432,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'bc9ea9e85d335fba1bc97be410018f2a27aa652e847f4fd040d36ab6e63c0142',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'a033c16089312f77d7724ae6fd22ff5f2524a7d684fdd2f6f3f94132bbb30784',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0c62616e6b4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '6bd6aa497445ff7340985fab44027accf6168ac85fd3e4b5f0c2bca32a2ff4d1',
		index: 1
	},
	updateNFT: {
		globalIndex: 45787435,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'e7a798baa9155d81af305e418021a1a628f1549dba859cabf0a7326946722a8a',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'da098134180c2391b108e7b9ec5727fa644daced2d4b0b3b9196d94c0fa57ace',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0e7570646174654e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '71a6cada6c67ada71d0417bda0c0294a363ca24261618ea7bf0eaee1762bd39e',
		index: 1
	},
	ballotTokenId: {
		globalIndex: 45787438,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '121ab0af96ad4213059ebaa89c2f07aebaee86ffb5724e339a1a07439f0b76c3',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'a662b14dcabc8dddc93bafe77de53adffdb8fb3dcf81d7be899dd383e46fffa1',
				amount: 5
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e1262616c6c6f74546f6b656e49642054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '2c2d132789cb06647099bd1514cd372eb68202387a70cae774e5c15ece4ef048',
		index: 1
	},
	interventionNFT: {
		globalIndex: 45787441,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'e4f51778145939a3c884db4ad2f4d9a289b35f291911e56f04751571d461c859',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '7db50c9a8b13fb02e9a330c0bef6f75a7e2cd8df312962ca10b7bc3169ce75d6',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e14696e74657276656e74696f6e4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '7746a3bb3ea905ec71475071ac6188119108e34d173a6da28cb92d9a24bac90f',
		index: 1
	},
	extractionNFT: {
		globalIndex: 45787444,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'e8170858fb5399ccd5c131fc353afc5afb7935a0def29b2ea4c856769dd5b918',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'e670ada0f96aab06aae481986182dbb0d351c6ae0e1ca65b47ef6bea7a69f6fb',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e1265787472616374696f6e4e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '8f1a2a2a6d9dc5aa9ce8ba5bb4ab5e2b11ddc746a212535a76d72af825938596',
		index: 1
	},
	arbitrageMintNFT: {
		globalIndex: 45787447,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'e893c8ba1376fdb90335eae5d9c8560a84a08f72cb095bfc8c83d03b37c821bc',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'a2e14bbfff15a86959862f351a03c84cb49cd078bbbfb27f95424ed4eba5dbb0',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e156172626974726167654d696e744e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '820aabe0b776e0ed92f6130d794b1fb22cff2b867fbabc149d6eb5978de9abfe',
		index: 1
	},
	freeMintNFT: {
		globalIndex: 45787450,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '1a424542c1b27cd6303105899bf78ecb22e02d74bcb2705292536e3d7e9f1360',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: '9fe049100ef4e4514c8dfe7b08d28e95e0dcdb267184bf4d6c6cf460e16c81d4',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e10667265654d696e744e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: '368e8c1532be99a9cd02c5dcbdc26e6829eeb89e1b2b7da335848bdb8e0d94de',
		index: 1
	},
	payoutNFT: {
		globalIndex: 45787457,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: '68c404058bd7dbff3e9432a06299f29d26569466da959a2802afcfb87cc8addb',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'b667ad04ff28c0a5af15bb7c453cfb10d531c8556e229617d6bda28309e2e0cd',
				amount: 1
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e0e7061796f75744e46542054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'dd2e52fb0096d77b153ef46d7f81982faa198cfdc6ece3abec4a1d6f31256175',
		index: 1
	},
	dexyTokenId: {
		globalIndex: 45787467,
		inclusionHeight: 1443454,
		address: '9euvZDx78vhK5k1wBXsNvVFGc5cnoSasnXCzANpaawQveDCHLbU',
		spentTransactionId: null,
		boxId: 'c1dc644be792d890f3f15372322c6f50e26950c41a765e6f4905177152c032fc',
		value: 1000000,
		ergoTree: '0008cd0233e9a9935c8bbb8ae09b2c944c1d060492a8832252665e043b0732bdf593bf2c',
		assets: [
			{
				tokenId: 'f679b3efbcd969c3f9699013e33169966211ac409a250332ca3dcb6694a512ed',
				amount: 10000000000000
			}
		],
		creationHeight: 1443452,
		additionalRegisters: {
			R4: '0e09446578792054455354',
			R5: '0e00',
			R6: '0e0130'
		},
		transactionId: 'c04d0afcf6649feee592216d140b2fbd0692a9481e2a32b6985473c3e24240d5',
		index: 1
	}
};
