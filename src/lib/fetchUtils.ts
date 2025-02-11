import { isDefined } from '@fleet-sdk/common';
import { jsonParseBigInt } from './api/ergoNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function get<T = any>(url: URL, params?: any): Promise<T> {
	if (isDefined(params)) {
		Object.keys(params).map((key) => url.searchParams.append(key, params[key]));
	}

	const response = await fetch(url, {
		headers: {
			'Content-Type': 'application/json'
		}
	});

	const text = await response.text();
	return jsonParseBigInt(text);
}
