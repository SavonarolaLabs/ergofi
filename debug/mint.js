import { mintTx } from "./mintTx.js";
import { createInputs, createOutputs, min, PK, sigmaProp } from "./utils.js";

let $initialLp = 100000000000;
const INPUTS = createInputs(mintTx);
const OUTPUTS = createOutputs(mintTx);
const SELF = INPUTS(1);

let lpBoxInIndex = 0;
let lpBoxOutIndex = 0;
let selfOutIndex = 1;
let successor = OUTPUTS(selfOutIndex);

let lpBoxIn = INPUTS(lpBoxInIndex);
let lpBoxOut = OUTPUTS(lpBoxOutIndex);

let lpReservesIn = lpBoxIn.tokens(1);
let lpReservesOut = lpBoxOut.tokens(1);

let reservesXIn = lpBoxIn.value;
let reservesYIn = lpBoxIn.tokens(2)._2;

let reservesXOut = lpBoxOut.value;
let reservesYOut = lpBoxOut.tokens(2)._2;

let supplyLpIn = $initialLp - lpReservesIn._2;

let deltaSupplyLp = lpReservesIn._2 - lpReservesOut._2;
let deltaReservesX = reservesXOut - reservesXIn;
let deltaReservesY = reservesYOut - reservesYIn;

let X = (deltaReservesX * supplyLpIn) / reservesXIn;
let Y = (deltaReservesY * supplyLpIn) / reservesYIn;

let validMintLp =
	deltaSupplyLp > 0 &&
	deltaReservesX > 0 &&
	deltaReservesY > 0 &&
	(() => {
		let sharesUnlocked = Math.floor(min(X, Y));
		return deltaSupplyLp <= sharesUnlocked;
	})();

let selfPreserved =
	successor.propositionBytes == SELF.propositionBytes &&
	successor.value >= SELF.value &&
	successor.tokens() == SELF.tokens();

const contract =
	sigmaProp(validMintLp && selfPreserved) ||
	PK('9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8');

console.log(contract);
