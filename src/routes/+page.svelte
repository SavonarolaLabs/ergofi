<script>
	import Elixir from '$lib/Elixir.svelte';
	import SwapWidget from '$lib/SwapWidget.svelte';
	import BankHistoryWidget from '$lib/BankHistoryWidget.svelte';
	import WalletButton from '$lib/WalletButton.svelte';
	import TransactionHistory from '$lib/TransactionHistory.svelte';
</script>

<nav class="sticky top-0 flex items-center justify-between px-4 py-2">
	<div class="flex space-x-4"></div>
	<div>
		<WalletButton></WalletButton>
	</div>
</nav>

<div class="flex h-full pb-10">
	<div class="flex grow items-end justify-start">
		<BankHistoryWidget></BankHistoryWidget>
	</div>
	<div class="justify-left flex grow items-center">
		<div>
			<SwapWidget></SwapWidget>
		</div>
	</div>
</div>

<TransactionHistory></TransactionHistory>
<div class="mt-20"></div>
<Elixir></Elixir>
