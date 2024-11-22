function boxToStrVal(box) {
	let newBox = JSON.parse(JSON.stringify(box));
	newBox.value = newBox.value.toString();

	if (newBox.assets === undefined) newBox.assets = [];
	for (let i = 0; i < newBox.assets.length; i++) {
		newBox.assets[i].amount = newBox.assets[i].amount.toString();
	}

	return newBox;
}

const mainnet_oracle =
	"011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f";
//011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f
//const testnet_oracle_gold = 'd94bfac40b516353983443209104dcdd5b7ca232a01ccb376ee8014df6330907';

const TOKEN_BANK_NFT =
	"7d672d1def471720ca5782fd6473e47e796d9ac0c138d9911346f118b2f6d9d9"; //SUSD Bank V2 NFT

export async function getOracleBox() {
	const resp = await fetch(
		`https://api.ergoplatform.com/api/v1/boxes/unspent/byTokenId/${mainnet_oracle}`
	);
	let data = await resp.json();
	let oracleBox = data.items[0];
	oracleBox = boxToStrVal(oracleBox);
	return oracleBox;
}

export async function getBankBox() {
	const resp = await fetch(
		`https://api.ergoplatform.com/api/v1/boxes/unspent/byTokenId/${TOKEN_BANK_NFT}`
	);
	let data = await resp.json();
	let bankBox = data.items[0];
	bankBox = boxToStrVal(bankBox);
	return bankBox;
}
