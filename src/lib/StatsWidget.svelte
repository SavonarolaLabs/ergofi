<script lang="ts">
	import { sigmausd_numbers } from '$lib/stores/bank';
</script>

<div>
	<div class="flex space-x-4">
		Reserve rate {$sigmausd_numbers.reserveRate}%, 400% = USD:{$sigmausd_numbers.leftUSD} | ERG:{$sigmausd_numbers.leftERG},
		800% = USD:{$sigmausd_numbers.rightUSD} | ERG:{$sigmausd_numbers.rightERG}
	</div>
</div>
