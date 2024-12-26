<script lang="ts">
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import ConnectWallet from './ConnectWallet.svelte';
</script>

<nav class="sticky top-0 flex items-center justify-between px-6 py-3">
	<div class="flex items-center text-gray-300">
		<span class="text-xl font-medium">Ergfi</span>
		<span class="text-md mx-2">/</span>
		<span class="text-md">SigmaUSD</span>
	</div>

	<div class="flex gap-2">
		<ThemeToggle></ThemeToggle>
		<!-- <WalletButton></WalletButton> -->
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
