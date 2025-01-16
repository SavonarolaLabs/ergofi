<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { loadUIState } from '$lib/stores/web3wallet';
	import { initMempoolChannels } from '$lib/mempoolChannels';
	import { X } from 'lucide-svelte';
	let { children } = $props();

	onMount(async () => {
		const teardown = initMempoolChannels();
		await loadUIState();
		return teardown;
	});
</script>

{@render children()}
