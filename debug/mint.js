import { mintTx } from "./mintTx";

function sigmaProp(a) {
	return a;
}
function PK(a) {
	return false;
}

const min = Math.min

const createInputs = (tx) => {
    return (i) => {
      const boxes = tx.inputs.reduce((acc, input, index) => {
        acc[index] = {
          value: Number(input.value),
          propositionBytes: input.ergoTree,
          tokens: (j) => {
            const assets = input.assets.reduce((assetAcc, asset, assetIndex) => {
              assetAcc[assetIndex] = { _1: asset.tokenId, _2: Number(asset.amount) };
              return assetAcc;
            }, {});
            return j === undefined ? JSON.stringify(assets) : assets[j];
          }
        };
        return acc;
      }, {});
      return boxes[i];
    };
  };
  
  const createOutputs = (tx) => {
    return (i) => {
      const boxes = tx.outputs.reduce((acc, output, index) => {
        acc[index] = {
          value: Number(output.value),
          propositionBytes: output.ergoTree,
          tokens: (j) => {
            const assets = output.assets.reduce((assetAcc, asset, assetIndex) => {
              assetAcc[assetIndex] = { _1: asset.tokenId, _2: Number(asset.amount) };
              return assetAcc;
            }, {});
            return j === undefined ? JSON.stringify(assets) : assets[j];
          }
        };
        return acc;
      }, {});
      return boxes[i];
    };
  };
  
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
