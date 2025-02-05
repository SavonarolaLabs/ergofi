<script>
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
	<div
		style="height:100vh;"
		class="flex flex-col items-center justify-center gap-4 p-4 text-gray-200"
	>
		<h1 class="text-4xl">Ergfi</h1>
		<div class="text-center text-lg text-gray-400">
			Visit on desktop to use algorithmic stablecoin Dapp.
		</div>
		<img src="demo.png" alt="" />
		<div class="flex gap-4">
			<a class="underline" href="https://github.com/SavonarolaLabs/ergofi">Github</a>
			<a href="https://discord.gg/xugP8G5asS" class="underline">Discord</a>
			<a href="https://x.com/c8e4d2" class="underline">Xtter</a>
		</div>
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

<style>
	.tachikoma-old-bg {
		background-size: contain;
		background-image: url('/atachikoma.png');
		background-repeat: no-repeat;
		background-position-x: right;
		background-position-y: bottom;
		background-size: 640px;
		z-index: -2;
	}
	.tachikoma-bg {
		background-color: #16151f;
		opacity: 1;
		background-image: radial-gradient(#252152 0.5px, #16151f 0.5px);
		background-size: 10px 10px;
		z-index: -2;
	}
</style>
