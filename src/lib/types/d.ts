// First, ensure the script is treated as a module by adding an export statement.
export {};

declare global {
	interface Window {
		ergoConnector: any; // Replace 'any' with the appropriate type if available
		ergo: any;
	}
	var ergo: any;
}
