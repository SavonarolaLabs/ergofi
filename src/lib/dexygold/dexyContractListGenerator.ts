import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, basename, extname } from 'path';

const BASE_PATH = 'src/lib/dexygold/contracts';
const OUTPUT_FILE = 'src/lib/dexygold/contractFiles.ts';

function generateConstants(basePath: string): void {
	function traverseDirectory(directory: string, prefix: string = 'DEXY') {
		const constants: Record<string, string> = {};
		const entries = readdirSync(directory);

		for (const entry of entries) {
			const fullPath = join(directory, entry);
			if (statSync(fullPath).isDirectory()) {
				Object.assign(
					constants,
					traverseDirectory(fullPath, `${prefix}_${entry.toUpperCase().replace(/-/g, '_')}`)
				);
			} else if (extname(entry) === '.es') {
				const constantName = `${prefix}_${basename(entry, '.es').toUpperCase().replace(/-/g, '_')}`;
				constants[constantName] = fullPath.replace(BASE_PATH + '/', '');
			}
		}

		return constants;
	}

	const constants = traverseDirectory(basePath);
	const fileContent = `export const contractFiles = ${JSON.stringify(constants, null, 2)};`;

	writeFileSync(OUTPUT_FILE, fileContent);
	console.log(`Generated file: ${OUTPUT_FILE}`);
}

generateConstants(BASE_PATH);
