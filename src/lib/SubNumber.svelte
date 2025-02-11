<script lang="ts">
	import { formatAmount } from './utils';

	export let value;

	function formatSmallNumber(num: number) {
		let str = num.toString();
		str = num.toString().replace(/^0+(\d)/, '$1');

		const match = str.match(/^0\.(0+)/); // Match leading zeros after the decimal
		const zeros = match ? match[1].length : 0;
		const significantDigits = str.slice(zeros + 2, zeros + 5); // Limit to 3 significant digits
		return { zeros, significantDigits };
	}
</script>

{#if typeof value !== 'number' || !isFinite(value) || isNaN(value) || value <= 0}
	0.0
{:else if value < 0.01}
	<span>
		0.0<sub>{formatSmallNumber(value).zeros}</sub>{formatSmallNumber(value).significantDigits}
	</span>
{:else if value < 100}
	{Number(value).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}
{:else if value < 1000}
	{Number(value).toLocaleString('en-US', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	})}
{:else}
	{formatAmount(value, false, 2)}
{/if}
