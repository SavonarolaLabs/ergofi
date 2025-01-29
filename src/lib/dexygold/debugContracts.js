import fs from 'fs';

/**
 * @param {import("@fleet-sdk/common").EIP12UnsignedTransaction} tx
 */
export function debugMint(tx){

    const OUTPUT_FILE = 'debug/mintTx.js'
    const fileContent = `export const mintTx = ${JSON.stringify(tx, null, 2)}`;

	try {
		fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
		console.log(`Generated file: ${OUTPUT_FILE}`);
	} catch (writeError) {
		console.error(`Failed to write output file: ${OUTPUT_FILE}`, writeError);
	}
}