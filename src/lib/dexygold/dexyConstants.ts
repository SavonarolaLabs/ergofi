// https://github.com/kushti/dexy-stable/blob/master/src/main/scala/dexy/chainutils/DexySpec.scala

export interface NetworkTokenIds {
	lpNFT: string;
	lpSwapNFT: string;
	lpMintNFT: string;
	lpRedeemNFT: string;
	lpTokenId: string;
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
}

export interface MainnetTokenIds extends NetworkTokenIds {
	gort: string;
	oracleTokenId: string;
	oraclePoolNFT: string;
	gortDevEmissionNFT: string;
	gortLpNFT: string;
	buybackNFT: string;
}

export const mainnetTokenIds: MainnetTokenIds = {
	// oracle related tokens
	gort: '7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9',
	oracleTokenId: '6183680b1c4caaf8ede8c60dc5128e38417bc5b656321388b22baa43a9d150c2',
	oraclePoolNFT: '3c45f29a5165b030fdb5eaf5d81f8108f9d8f507b31487dd51f4ae08fe07cf4a',
	gortDevEmissionNFT: 'bb484bb7fea08b15861e27cb203a13069082befb05f5437cae71237d9c5c6ac3',
	gortLpNFT: 'd1c9e20657b4e37de3cd279a994266db34b18e6e786371832ad014fd46583198',
	buybackNFT: 'bf24ed4af7eb5a7839c43aa6b240697d81b196120c837e1a941832c266d3755c',

	// overridden tokens
	lpNFT: '905ecdef97381b92c2f0ea9b516f312bfb18082c61b24b40affa6a55555c77c7',
	lpSwapNFT: 'c9f1304c58a1b789c0c5b4c601fa12acde1188fdff245d72bdc549c9296d2aa4',
	lpMintNFT: '19b8281b141d19c5b3843a4a77e616d6df05f601e5908159b1eaf3d9da20e664',
	lpRedeemNFT: '08c47eef5e782f146cae5e8cfb5e9d26b18442f82f3c5808b1563b6e3b23f729',
	lpTokenId: '376603b9ecbb953202fbac977f418ab5edc9d9effafbbe1418f5aece661dfa1f',
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
	dexyTokenId: '6122f7289e7bb2df2de273e09d4b2756cda6aeb0f40438dc9d257688f45183ad'
};

export const contractConfig = {
	initialDexyTokens: '10000000000000L',
	initialLp: '100000000000L',
	feeNumLp: '997',
	feeDenomLp: '1000'
};
