<script lang="ts">
	import { formatAmount } from './utils';
	export let i;
</script>

{#if i.amountCurrency == 'SigUSD'}
	<div>
		<span class="mr-1 text-3xl">
			{formatAmount(i.ergAmount)}
		</span>
		<span class="text-lg" style="padding-right:22px;">ERG</span>
	</div>
	<div class="text-right">
		{formatAmount(i.amount)}
		<span style="margin-left:5px;">{i.amountCurrency}</span>
	</div>
{:else}
	<div>
		<span class="mr-1 text-3xl">{formatAmount(i.amount)}</span>
		<span class="text-lg"> {i.amountCurrency} </span>
	</div>
	<div class="text-right">
		{formatAmount(i.ergAmount)}
		<span style="margin-left:5px; padding-right:30px;">ERG</span>
	</div>
{/if}
