<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'lucide-svelte';

	let isDark: boolean = false;

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	onMount(() => {
		// Check saved theme or system preference
		const savedTheme = localStorage.getItem('theme');

		if (savedTheme) {
			isDark = savedTheme === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}

		// Apply initial theme
		document.documentElement.classList.toggle('dark', isDark);
	});
</script>

<button
	on:click={toggleTheme}
	class="rounded-full bg-gray-200 p-2 transition-colors duration-300 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}
		<Sun class="h-6 w-6 text-yellow-500" />
	{:else}
		<Moon class="h-6 w-6 text-gray-800" />
	{/if}
</button>
