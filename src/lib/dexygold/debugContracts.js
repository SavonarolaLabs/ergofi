import fs from 'fs';

/**
 * @param {import("@fleet-sdk/common").EIP12UnsignedTransaction} tx
 */
export function debugMint(tx){
	saveTx('mint', tx);

}

/**
 * @param {import("@fleet-sdk/common").EIP12UnsignedTransaction} tx
 */
export function debugRedeem(tx){
	saveTx('redeem', tx);
}

/**
 * @param {import("@fleet-sdk/common").EIP12UnsignedTransaction} tx
 */
export function debugArbmint(tx){
	saveTx('arbmint', tx);
}


/**
 * Saves a transaction object to a JavaScript file.
 * 
 * @param {string} name - The name of the transaction.
 * @param {import("@fleet-sdk/common").EIP12UnsignedTransaction} tx - The unsigned transaction object.
 */
function saveTx(name, tx) {
    const OUTPUT_FILE = `debug/${name}Tx.js`;
    const fileContent = `export const ${name}Tx = ${JSON.stringify(tx, null, 2)}`;

    try {
        fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
        console.log(`Generated file: ${OUTPUT_FILE}`);
    } catch (writeError) {
        console.error(`Failed to write output file: ${OUTPUT_FILE}`, writeError);
    }
}
