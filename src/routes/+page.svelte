<script>
	import SwapWidget from '$lib/SwapWidget/SwapWidget.svelte';
	import BankHistoryWidget from '$lib/BankHistoryWidget.svelte';
	import Navbar from '$lib/Navbar.svelte';
	import { onMount } from 'svelte';

	let isMobile = false;

	let theme = 'powwowgirls';
	//let theme = 'ergfi';

	// Detect mobile device
	onMount(() => {
		isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);

		if (theme == 'ergfi') {
			document.documentElement.style.setProperty('--cl-text', '#6A7280');
			document.documentElement.style.setProperty('--cl-border', '#1F2937');
			document.documentElement.style.setProperty('--cl-bg', '#16151F');
			document.documentElement.style.setProperty('--cl-bg-alpha', '#26243759');
			document.documentElement.style.setProperty('--cl-bg-widget', '#1B1B28');
			document.documentElement.style.setProperty('--cl-contrast-text', '#CCC');
		}
		if (theme == 'powwowgirls') {
			document.documentElement.style.setProperty('--cl-text', '#2e3035');
			document.documentElement.style.setProperty('--cl-bg', '#f5f2a8');
		}
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
	<div
		class="flex flex-col"
		class:ergfi-bg={theme == 'ergfi'}
		class:powwowgirl-bg={theme == 'powwowgirls'}
		style="min-height:100vh;"
	>
		<Navbar></Navbar>
		<div class="flex grow max1024:flex-col-reverse">
			<div class="flex flex-col max1024:items-center">
				<div class="flex grow items-end justify-start">
					<BankHistoryWidget></BankHistoryWidget>
				</div>
			</div>
			<div class="min1024:justify-left flex grow items-center max1024:justify-center">
				<div class="min1024:ml-[20%] min1024:mt-[-10%]">
					<SwapWidget />
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.powwowgirl-bg {
		background-color: var(--cl-bg);
		background-size: contain;
		background-image: url('/powwowgirl2.png');
		background-repeat: no-repeat;
		background-position-x: right;
		background-position-y: bottom;
		background-size: 100vh;
		z-index: -2;
	}
	.ergfi-bg {
		background-color: #16151f;
		opacity: 1;
		background-image: radial-gradient(#252152 0.5px, #16151f 0.5px);
		background-size: 10px 10px;
		z-index: -2;
	}
</style>
