<script>
	import Elixir from '$lib/Elixir.svelte';
	import SwapWidget from '$lib/SwapWidget.svelte';
	import BankHistoryWidget from '$lib/BankHistoryWidget.svelte';
	import LoanWidget from '$lib/LoanWidget.svelte';
	import Navbar from '$lib/Navbar.svelte';
</script>

<div class="flex flex-col" style="height:100vh;">
	<Navbar></Navbar>
	<div class="flex grow">
		<div class="flex grow flex-col">
			<div class="p-4">
				<LoanWidget></LoanWidget>
			</div>
			<div class="flex grow items-end justify-start">
				<BankHistoryWidget></BankHistoryWidget>
			</div>
		</div>

		<div class="justify-left tachikoma-bg flex grow items-center">
			<div>
				<SwapWidget></SwapWidget>
			</div>
		</div>
	</div>
</div>

<!-- <Elixir></Elixir> -->
<style>
	.tachikoma-bg {
		background-size: contain;
		background-image: url('/tachikoma.jpg');
		background-repeat: no-repeat;
		background-position-x: right;
		background-position-y: bottom;
		background-size: 640px;
	}
</style>
