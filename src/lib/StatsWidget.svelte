<script lang="ts">
	import {
		reserve_border_left_ERG,
		reserve_border_left_USD,
		reserve_border_right_ERG,
		reserve_border_right_USD,
		reserve_rate
	} from '$lib/stores/bank';
</script>

<div>
	<div class="flex space-x-4">
		Reserve rate {$reserve_rate}%, 400% = USD:{$reserve_border_left_USD} | ERG:{$reserve_border_left_ERG},
		800% = USD:{$reserve_border_right_USD} | ERG:{$reserve_border_right_ERG}
	</div>
</div>
