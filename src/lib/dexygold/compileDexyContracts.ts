import { compileDexyContractFromFile } from './compile';
import { contractFiles } from './contractFiles';
import fs from 'fs';
import path from 'path';
import { contractCompileVariables } from './dexyConstants';

const OUTPUT_FILE = 'src/lib/dexygold/dexyAddressConstants.ts';

async function compileAllContracts() {
	const lines: string[] = [];

	for (const [constName, filePath] of Object.entries(contractFiles)) {
		try {
			if ('DEXY_BANK_UPDATE_UPDATE' == constName) {
				// val bankUpdateScript = readContract("bank/update/update.es", "contractToUpdateNFT" -> defaultSubstitutionMap("bankNFT"))
				// val bankUpdateErgoTree = ScriptUtil.compile(Map(), bankUpdateScript)
				// val bankUpdateAddress = getStringFromAddress(getAddressFromErgoTree(bankUpdateErgoTree))
				const variables = contractCompileVariables;
				variables['contractToUpdateNFT'] = contractCompileVariables.bankNFT;
				const address = compileDexyContractFromFile(filePath, variables);
				lines.push(`export const DEXY_BANK_UPDATE_UPDATE = "${address}";`);

				// val extractUpdateScript = readContract("bank/update/update.es", "contractToUpdateNFT" -> defaultSubstitutionMap("extractionNFT"))
				// val extractUpdateErgoTree = ScriptUtil.compile(Map(), extractUpdateScript)
				// val extractUpdateAddress = getStringFromAddress(getAddressFromErgoTree(extractUpdateErgoTree))
				variables['contractToUpdateNFT'] = contractCompileVariables.extractionNFT;
				const address2 = compileDexyContractFromFile(filePath);
				lines.push(`export const DEXY_BANK_UPDATE_UPDATE_EXTRACT = "${address2}";`);

				// val interventionUpdateScript = readContract("bank/update/update.es", "contractToUpdateNFT" -> defaultSubstitutionMap("interventionNFT"))
				// val interventionUpdateErgoTree = ScriptUtil.compile(Map(), interventionUpdateScript)
				// val interventionUpdateAddress = getStringFromAddress(getAddressFromErgoTree(interventionUpdateErgoTree))
				variables['contractToUpdateNFT'] = contractCompileVariables.interventionNFT;
				const address3 = compileDexyContractFromFile(filePath);
				lines.push(`export const DEXY_BANK_UPDATE_UPDATE_INTERVENTION = "${address3}";`);
			} else {
				const address = compileDexyContractFromFile(filePath);
				lines.push(`export const ${constName} = "${address}";`);
			}
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
