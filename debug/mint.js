function sigmaProp(a) {
	return a;
}
function PK(a) {
	return false;
}

const min = Math.min;

let $initialLp = 100000000000;

const INPUTS = (i) => {
	const boxes = {
		0: {
			// lpBoxIn
			value: 43224547253880,
			tokens: (i) => {
				const assets = {
					0: {
						_1: '323bf7f5cfcc33f3e4f1bd559113e46592139835b64bfe02aa810658980cb50c',
						_2: 1
					},
					1: {
						_1: '23b682cde32b4d0e8492caa472b526f8419f7181363534e0cbab92b3c5d452d4',
						_2: 93600000000
					},
					2: {
						_1: 'f679b3efbcd969c3f9699013e33169966211ac409a250332ca3dcb6694a512ed',
						_2: 1000000
					}
				};
				return i == undefined ? JSON.stringify(assets) : assets[i];
			}
		},
		1: {
			propositionBytes: 'self',
			value: 1000000000,
			tokens: (i) => {
				const assets = {
					0: {
						_1: '27521c68cbf6863bf2e6a087495d2b6794db36303e18dfac68e1d9e1824931de',
						_2: 1
					}
				};
				return i == undefined ? JSON.stringify(assets) : assets[i];
			}
		}
	};
	return boxes[i];
};
const SELF = INPUTS(1);

const OUTPUTS = (i) => {
	const boxes = {
		0: {
			// lpBoxOut
			value: 43224547753880,
			tokens: (i) => {
				const assets = {
					0: {
						_1: '323bf7f5cfcc33f3e4f1bd559113e46592139835b64bfe02aa810658980cb50c',
						_2: 1
					},
					1: {
						_1: '23b682cde32b4d0e8492caa472b526f8419f7181363534e0cbab92b3c5d452d4',
						_2: 93599998918
					},
					2: {
						_1: 'f679b3efbcd969c3f9699013e33169966211ac409a250332ca3dcb6694a512ed',
						_2: 1000050
					}
				};
				return i == undefined ? JSON.stringify(assets) : assets[i];
			}
		},
		1: {
			// successor
			propositionBytes: 'self',
			value: 1000000000,
			tokens: (i) => {
				const assets = {
					0: {
						_1: '27521c68cbf6863bf2e6a087495d2b6794db36303e18dfac68e1d9e1824931de',
						_2: 1
					}
				};
				return i == undefined ? JSON.stringify(assets) : assets[i];
			}
		}
	};
	return boxes[i];
};

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
