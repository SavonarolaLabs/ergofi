<script>
	import WalletButton from '$lib/WalletButton.svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import {
		reserve_boarder_left_ERG,
		reserve_boarder_left_USD,
		reserve_boarder_right_ERG,
		reserve_boarder_right_USD,
		reserve_rate
	} from '$lib/stores/bank';
	import ConnectWallet from './ConnectWallet.svelte';
</script>

<nav class="sticky top-0 flex items-center justify-between px-4 py-2">
	<div class="flex space-x-4">
		Reserve rate {$reserve_rate}%, 400% = USD:{$reserve_boarder_left_USD} | ERG:{$reserve_boarder_left_ERG},
		800% = USD:{$reserve_boarder_right_USD} | ERG:{$reserve_boarder_right_ERG}
	</div>

	<div class="flex gap-2">
		<ThemeToggle></ThemeToggle>
		<!-- <WalletButton></WalletButton> -->
		<ConnectWallet></ConnectWallet>
	</div>
</nav>
