<script lang="ts">
	export let value;

	function formatSmallNumber(num: number) {
		const str = num.toString();
		const match = str.match(/^0\.(0+)/); // Match leading zeros after the decimal
		const zeros = match ? match[1].length : 0;
		const significantDigits = str.slice(zeros + 2, zeros + 5); // Limit to 3 significant digits
		return { zeros, significantDigits };
	}
</script>

{#if value != undefined}
	{#if value < 0.01}
		<span>
			0.0<sub>{formatSmallNumber(value).zeros}</sub>{formatSmallNumber(value).significantDigits}
		</span>
	{:else}
		{value}
	{/if}
{/if}
