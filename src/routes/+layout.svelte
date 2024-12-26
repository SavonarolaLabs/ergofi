<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { loadUIState } from '$lib/stores/web3wallet';
	let { children } = $props();

	onMount(async () => {
		await loadUIState();
	});
</script>

{@render children()}

<style lang="postcss">
	/* Light Mode (default) */
	:global(html) {
		@apply bg-light-background text-light-text transition-colors;
		font-weight: 300; /* Light font */
		letter-spacing: 0.025em; /* Slightly wide */
	}

	/* Dark Mode */
	:global(html.dark) {
		@apply bg-dark-background text-dark-text;
	}
</style>
