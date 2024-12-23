//Short Logic:
//1. Get Asset List
//2. Get current Markets
//3. Filter Markets: baseId = ErgId && quoteId <- Asset List
// Return map [ID, PRICE]

//1. Get Asset List
const VERIFIED_TOKEN_IDS = new Set(VERIFIED_ASSETS.map((x) => x.tokenId));

//2. Get Spectrum Pools and IDs
//https://api.spectrum.fi/v1/amm/pools/stats //Active AMM TokenX vs TokenY
// Response example:
// [
// {
//     "id": "69b53802934a6084065b3ac4976aeeeaa8cf85e74ad8c6c0feecc9b3e4fbdf9c",
//     "lockedX": {
//       "id": "fa990744195ff8d608d557e4d34fc2eb440d612ed87550d5fd712b9fb28b1488",
//       "amount": 203106812731,
//       "ticker": "👨‍❤️‍👨",
//       "decimals": 0
//     },
//     "lockedY": {
//       "id": "fffe6122886e3b0ab9b72b401b39bf8d3f13580c1335a41d91d19deb8038ccd4",
//       "amount": 15456294687227026,
//       "ticker": "BBC",
//       "decimals": 0
//     },
//     "tvl": {
//       "value": 31.37,
//       "units": {
//         "currency": {
//           "id": "USD",
//           "decimals": 2
//         }
//       }
//     }
// ]

// Price with Timeframe
// v1/price-tracking/markets
// From To can be NULL // But here Use Date.now() and Date.now()-30

async function getTokenRatesFromSpectrum(): Promise<Map<string, BigNumber>> {
	const [markets, hiLiqTokens] = await Promise.all([
		spectrumService.getActivePools(),
		assetPricingService.getHighLiquidityTokenIds()
	]);

	const map = new Map<string, BigNumber>();
	uniqWith(
		markets.filter(
			(p) =>
				VERIFIED_TOKEN_IDS.has(p.quoteId) ||
				(p.baseId === SPECTRUM_ERG_TOKEN_ID && hiLiqTokens.has(p.quoteId))
		),
		(a, b) => a.quoteId === b.quoteId && a.baseVolume.value <= b.baseVolume.value
	).map((pool) => map.set(pool.quoteId, _1.div(pool.lastPrice)));

	return map;
}
