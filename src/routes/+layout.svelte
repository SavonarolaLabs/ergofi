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
