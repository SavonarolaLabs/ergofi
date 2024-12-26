<script>
	import Elixir from '$lib/Elixir.svelte';
	import SwapWidget from '$lib/SwapWidget.svelte';
	import BankHistoryWidget from '$lib/BankHistoryWidget.svelte';
	import LoanWidget from '$lib/LoanWidget.svelte';
	import Navbar from '$lib/Navbar.svelte';
</script>

<Navbar></Navbar>
<LoanWidget></LoanWidget>
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

<div class="mt-20"></div>
<Elixir></Elixir>
