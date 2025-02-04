import BigNumber from 'bignumber.js';

function calculateBorderUSD(
	border: number,
	bankUSD: BigNumber,
	bankERG: BigNumber,
	price: BigNumber
) {
	const a_Left = BigNumber(bankERG).multipliedBy(price);
	const b_Left = BigNumber(bankUSD).multipliedBy(border);
	const delta_a_b_Left = a_Left.minus(b_Left);
	const borderUSD = delta_a_b_Left.dividedBy(border - 1);
	return borderUSD;
}

function calculateBorderRSV(
	border: number,
	bankUSD: BigNumber,
	bankERG: BigNumber,
	price: BigNumber,
	priceRSV: BigNumber
) {
	const adjErg = bankUSD.multipliedBy(border).dividedBy(price);
	const deltaErg = adjErg.minus(bankERG);
	const borderRSV = deltaErg.multipliedBy(priceRSV);
	return borderRSV;
}

// prettier-ignore
export function calculateReserveRateAndBorders(
    inErg: bigint,
    inCircSigUSD: bigint,
    oraclePrice: bigint,
    rsvPriceBuy: number,
    rsvPriceSell: number
): any {
    // Clear convert
    const bankERG = BigNumber(inErg.toString()).dividedBy(10 ** 9); //convert to ERG
    const bankUSD = BigNumber(inCircSigUSD.toString()).dividedBy(100); //convert to USD
    const priceRSVBuy = BigNumber(rsvPriceBuy.toString());
    const priceRSVSell = BigNumber(rsvPriceSell.toString());

    const priceUSD = BigNumber(10 ** 9)
        .dividedBy(BigNumber(oraclePrice.toString()))
        .dividedBy(100); //convert to ERG / USD price

    const reserveRate = Number(
        bankERG.multipliedBy(priceUSD).dividedBy(bankUSD).multipliedBy(100).toFixed(0)
    ); // as function

    const leftBorder = 4;
    const rightBorder = 8;

    const leftUSD = Number(calculateBorderUSD(leftBorder, bankUSD, bankERG, priceUSD).toFixed(0));
    const leftERG = Number(BigNumber(leftUSD).dividedBy(priceUSD).toFixed(0));
    const rightUSD = Number(calculateBorderUSD(rightBorder, bankUSD, bankERG, priceUSD).toFixed(0));
    const rightERG = Number(BigNumber(rightUSD).dividedBy(priceUSD).toFixed(0));
    const leftRSV = Number(	calculateBorderRSV(leftBorder, bankUSD, bankERG, priceUSD, priceRSVBuy).toFixed(0));
    const rightRSV = Number(calculateBorderRSV(rightBorder, bankUSD, bankERG, priceUSD, priceRSVSell).toFixed(0));
    
    return { reserveRate, leftUSD, rightUSD, leftERG, rightERG, leftRSV, rightRSV };
}
