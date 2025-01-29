function sigmaProp(a){
    return a;
}
function PK(a){
    return false;
}

const min = Math.min;

let $initialLp = 123;

const INPUTS =(i) => {
    const boxes = {
        0: { // lpBoxIn
            tokens: (i)=>{
                const assets = {
                    1:    {
                        _1: 'tokenId',
                        _2: 2123,
                    },
                    2:    {
                        _1: 'tokenId',
                        _2: 2123,
                    }
                }
                return i == undefined ? JSON.stringify(assets):assets[i];
            }
        },
        1:{
            propositionBytes: 'self',
            value: 100,
            tokens: (i)=>{
                const assets = {
                    1:    {
                        _1: 'tokenId',
                        _2: 2123,
                    },
                    2:    {
                        _1: 'tokenId',
                        _2: 2123,
                    }
                }
                return i == undefined ? JSON.stringify(assets):assets[i];
            }
        }
    }
    return boxes[i];
}
const SELF = INPUTS(1)

const OUTPUTS = (i) =>{
    const boxes = {
        0: { // lpBoxOut
            value: 100,
            tokens: (i)=>{
                const assets = {
                    1:    {
                        _1: 'tokenId',
                        _2: 2123,
                    },
                    2:    {
                        _1: 'tokenId',
                        _2: 2123,
                    }
                }
                return i == undefined ? JSON.stringify(assets):assets[i];
            }
        },
        1: { // successor
            propositionBytes: 'self',
            value: 100,
            tokens: (i)=>{
                const assets = {
                    1:    {
                        _1: 'tokenId',
                        _2: 2123,
                    },
                    2:    {
                        _1: 'tokenId',
                        _2: 2123,
                    }
                }
                return i == undefined ? JSON.stringify(assets):assets[i];
            }
        }
    }
    return boxes[i];
}

let lpBoxInIndex = 0
let lpBoxOutIndex = 0
let selfOutIndex = 1
let successor = OUTPUTS(selfOutIndex)

let lpBoxIn = INPUTS(lpBoxInIndex)
let lpBoxOut = OUTPUTS(lpBoxOutIndex)

let lpReservesIn = lpBoxIn.tokens(1)
let lpReservesOut = lpBoxOut.tokens(1)

let reservesXIn = lpBoxIn.value
let reservesYIn = lpBoxIn.tokens(2)._2

let reservesXOut = lpBoxOut.value
let reservesYOut = lpBoxOut.tokens(2)._2

let supplyLpIn = $initialLp - lpReservesIn._2

let deltaSupplyLp = lpReservesIn._2 - lpReservesOut._2
let deltaReservesX = reservesXOut - reservesXIn
let deltaReservesY = reservesYOut - reservesYIn

let validMintLp = deltaSupplyLp > 0 && deltaReservesX > 0 && deltaReservesY > 0 && (()=>{
    let sharesUnlocked = min(
        deltaReservesX * supplyLpIn / reservesXIn,
        deltaReservesY * supplyLpIn / reservesYIn
    )
    return deltaSupplyLp <= sharesUnlocked
})()

let selfPreserved = successor.propositionBytes == SELF.propositionBytes  &&
                    successor.value >= SELF.value                        &&
                    successor.tokens() == SELF.tokens()

const contract = sigmaProp(validMintLp && selfPreserved) || PK("9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8")

console.log(contract);