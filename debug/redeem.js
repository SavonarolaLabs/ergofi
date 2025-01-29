import { redeemTx } from "./redeemTx.js";
import { createContext, createInputs, createOutputs, PK, sigmaProp } from "./utils.js";
import { parse } from '@fleet-sdk/serializer';

const CONTEXT = createContext(redeemTx);
const INPUTS = createInputs(redeemTx);
const OUTPUTS = createOutputs(redeemTx);
const SELF = INPUTS(1);
let initialLp = 100000000000;

let lpBoxInIndex = 0
let oracleBoxIndex = 0
let lpBoxOutIndex = 0
let selfOutIndex = 1

let oracleNFT = 'e38048c74cb92bb2f908c2465106f7ab2f2632fbbbb72a26c372276263b2b011';

let lpBoxIn = INPUTS(lpBoxInIndex)

let oracleBox = CONTEXT.dataInputs(oracleBoxIndex)
let lpBoxOut = OUTPUTS(lpBoxOutIndex)
let successor = OUTPUTS(selfOutIndex)

let lpReservesIn = lpBoxIn.tokens(1)
let lpReservesOut = lpBoxOut.tokens(1)

let reservesXIn = lpBoxIn.value
let reservesYIn = lpBoxIn.tokens(2)._2

let reservesXOut = lpBoxOut.value
let reservesYOut = lpBoxOut.tokens(2)._2

let supplyLpIn = initialLp - lpReservesIn._2

let oracleRateXy = parse(oracleBox.R4) / 1000000
let lpRateXyIn = reservesXIn / reservesYIn

let validOracleBox = oracleBox.tokens(0)._1 == oracleNFT

let validRateForRedeemingLp = validOracleBox && lpRateXyIn > oracleRateXy * 98 / 100

let deltaSupplyLp  = lpReservesIn._2 - lpReservesOut._2
let deltaReservesX = reservesXOut - reservesXIn
let deltaReservesY = reservesYOut - reservesYIn

let validRedemption = deltaSupplyLp < 0 && deltaReservesX < 0 && deltaReservesY < 0 && (()=>{
    let _deltaSupplyLp = deltaSupplyLp

    let a = deltaReservesX * supplyLpIn * 100 / 98 >= _deltaSupplyLp * reservesXIn
    let b = deltaReservesY * supplyLpIn * 100 / 98 >= _deltaSupplyLp * reservesYIn
    return a && b
})() && validRateForRedeemingLp

let selfPreserved = successor.propositionBytes == SELF.propositionBytes  &&
                    successor.value >= SELF.value                        &&
                    successor.tokens == SELF.tokens

const contract = sigmaProp(validRedemption && selfPreserved )|| PK("9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8")

console.log(contract);
