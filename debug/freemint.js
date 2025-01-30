import { freemintTx } from './freemintTx.js';
import { createContext, createInputs, createOutputs, getTxHeight, PK, sigmaProp } from './utils.js';

const HEIGHT = getTxHeight(freemintTx);
const CONTEXT = createContext(freemintTx);
const INPUTS = createInputs(freemintTx);
const OUTPUTS = createOutputs(freemintTx);
const SELF = INPUTS(0);

let bankInIndex = 1;
let buybackInIndex = 2;

let selfOutIndex = 0;
let bankOutIndex = 1;
let buybackOutIndex = 2;

let oracleBoxIndex = 0;
let lpBoxIndex = 1;

let bankNFT = 'a033c16089312f77d7724ae6fd22ff5f2524a7d684fdd2f6f3f94132bbb30784';
let buybackNft = '109dfaf60489985fc43fbbf3a49cc2f41eedc33f7b01370122c69cf4aeb58272';

let oracleNFT = 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011';
let lpNFT = '323bf7f5cfcc33f3e4f1bd559113e46592139835b64bfe02aa810658980cb50c';

let T_free = 360;
let T_buffer = 5;

let bankFeeNum = 3;
let buybackFeeNum = 2;
let feeDenom = 1000;

let oracleBox = CONTEXT.dataInputs(oracleBoxIndex);
let lpBox = CONTEXT.dataInputs(lpBoxIndex);

let bankBoxIn = INPUTS(bankInIndex);
let buybackBoxIn = INPUTS(buybackInIndex);

let successor = OUTPUTS(selfOutIndex);
let bankBoxOut = OUTPUTS(bankOutIndex);
let buybackOut = OUTPUTS(buybackOutIndex);

let selfInR4 = SELF.R4;
let selfInR5 = SELF.R5;
let successorR4 = successor.R4;
let successorR5 = successor.R5;

let isCounterReset = HEIGHT > selfInR4;

let oracleRate = oracleBox.R4 / 1000000;

let lpReservesX = lpBox.value;
let lpReservesY = lpBox.tokens(2)._2;
let lpRate = lpReservesX / lpReservesY;

let validRateFreeMint = lpRate * 100 > oracleRate * 98;

let dexyMinted = bankBoxIn.tokens(1)._2 - bankBoxOut.tokens(1)._2;
let ergsAdded = bankBoxOut.value - bankBoxIn.value;
let bankRate = Math.floor((oracleRate * (bankFeeNum + feeDenom)) / feeDenom);
let validBankDelta = ergsAdded >= dexyMinted * bankRate && ergsAdded > 0;

let buybackErgsAdded = buybackOut.value - buybackBoxIn.value;
let buybackRate = Math.floor((oracleRate * buybackFeeNum) / feeDenom);
let validBuybackDelta = buybackErgsAdded >= dexyMinted * buybackRate && buybackErgsAdded > 0;
let validDelta = validBankDelta && validBuybackDelta;

let maxAllowedIfReset = lpReservesY / 100;

let availableToMint = isCounterReset ? maxAllowedIfReset : selfInR5;

let validAmount = dexyMinted <= availableToMint;

let validSuccessorR4 = !isCounterReset
	? successorR4 == selfInR4
	: successorR4 >= HEIGHT + T_free && successorR4 <= HEIGHT + T_free + T_buffer;

let validSuccessorR5 = successorR5 == availableToMint - dexyMinted;

let validBankBoxInOut = bankBoxIn.tokens(0)._1 == bankNFT;
let validBuyBackIn = buybackBoxIn.tokens(0)._1 == buybackNft;
let validLpBox = lpBox.tokens(0)._1 == lpNFT;
let validOracleBox = oracleBox.tokens(0)._1 == oracleNFT;
let validSuccessor =
	successor.tokens() == SELF.tokens() &&
	successor.propositionBytes == SELF.propositionBytes &&
	successor.value >= SELF.value &&
	validSuccessorR5 &&
	validSuccessorR4;

const contract =
	sigmaProp(
		validAmount &&
			validBankBoxInOut &&
			validLpBox &&
			validOracleBox &&
			validBuyBackIn &&
			validSuccessor &&
			validDelta &&
			validRateFreeMint
	) || PK('9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8');

console.log(contract);
