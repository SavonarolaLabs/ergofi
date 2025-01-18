import { compileContractFromFile } from './compile';
import { contractFiles } from './contractFiles';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = 'src/lib/dexygold/dexyAddressConstants.ts';

async function compileAllContracts() {
	const lines: string[] = [];

	for (const [constName, filePath] of Object.entries(contractFiles)) {
		try {
			const address = compileContractFromFile(filePath);
			lines.push(`export const ${constName} = "${address}";`);
		} catch (error) {
			console.error(`Failed to compile contract for ${constName} (${filePath}):`, error);
			return; // Abort the entire process if an error occurs
		}
	}

	const fileContent = lines.join('\n');

	try {
		fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
		console.log(`Generated file: ${OUTPUT_FILE}`);
	} catch (writeError) {
		console.error(`Failed to write output file: ${OUTPUT_FILE}`, writeError);
	}
}

compileAllContracts();
