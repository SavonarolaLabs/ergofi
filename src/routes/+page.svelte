<script>
	import Elixir from '$lib/Elixir.svelte';
	import SwapWidget from '$lib/SwapWidget.svelte';
	import BankHistoryWidget from '$lib/BankHistoryWidget.svelte';
	import Navbar from '$lib/Navbar.svelte';
	import { onMount } from 'svelte';

	let isMobile = false;

	// Detect mobile device
	onMount(() => {
		isMobile =
			/Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ||
			window.matchMedia('(max-width: 768px)').matches;
	});
</script>

{#if isMobile}
	<BankHistoryWidget></BankHistoryWidget>
	<div style="visibility:hidden">
		<SwapWidget></SwapWidget>
	</div>
{:else}
	<div class="tachikoma-bg flex flex-col" style="height:100vh;">
		<Navbar></Navbar>
		<div class="flex grow">
			<div class="flex flex-col">
				<div class="flex grow items-end justify-start">
					<BankHistoryWidget></BankHistoryWidget>
				</div>
			</div>
			<div class="justify-left flex grow items-center">
				<div style="margin-top:-10%; margin-left:20%;">
					<SwapWidget></SwapWidget>
				</div>
			</div>
		</div>
	</div>
{/if}

<Elixir></Elixir>

<style>
	.tachikoma-bg {
		background-size: contain;
		background-image: url('/tachikoma.png');
		background-repeat: no-repeat;
		background-position-x: right;
		background-position-y: bottom;
		background-size: 640px;
	}
</style>
