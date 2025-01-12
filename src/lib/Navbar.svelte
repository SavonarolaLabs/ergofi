<script lang="ts">
	import ConnectWallet from './ConnectWallet.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<nav class="sticky top-0 flex items-center justify-between px-6 py-3" style="background: #16151f;">
	<div class="flex items-center text-gray-300">
		<span class="text-xl font-medium">Ergfi</span>
		<span class="text-md mx-2">/</span>
		<span class="text-md">SigmaUSD</span>
		<sup class="ml-1 text-xs text-gray-500">alpha</sup>
	</div>

	<div class="flex gap-2">
		<div style="visibility:hidden;">
			<ThemeToggle></ThemeToggle>
		</div>
		<ConnectWallet></ConnectWallet>
	</div>
</nav>

<style>
	.brand {
		font-family:
			HelveticaNeue-CondensedBold,
			Futura-Medium,
			-apple-system,
			'Arial Rounded MT Bold',
			system-ui,
			Ubuntu,
			sans-serif,
			'Arial Unicode MS',
			'Zapf Dingbats',
			'Segoe UI Emoji',
			'Segoe UI Symbol',
			Noto Color Emoji,
			NotoColorEmoji,
			EmojiSymbols,
			Symbola,
			Noto,
			'Android Emoji',
			AndroidEmoji,
			'lucida grande',
			tahoma,
			verdana,
			arial,
			AppleColorEmoji,
			'Apple Color Emoji';
	}
</style>
