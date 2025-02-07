<script lang="ts">
	import ConnectWallet from './ConnectWallet.svelte';
	import { ERGO_TOKEN_ID, SigRSV_TOKEN_ID, SigUSD_TOKEN_ID } from './stores/ergoTokens';
	import { web3wallet_confirmedTokens, web3wallet_connected } from './stores/web3wallet';
	import ThemeToggle from './ThemeToggle.svelte';
	import { centsToUsd, formatAmount, nanoErgToErg } from './utils';

	let pending = true;
</script>

<nav class="sticky top-0 flex items-center justify-between px-6 py-3">
	<div class="flex items-start text-gray-300">
		<span class="flex gap-1 text-xl font-medium">
			{#each 'ERGFI' as letter}
				<div class="square">{letter}</div>
			{/each}
		</span>
		<!-- <span class="text-md mx-2">/</span>
		<span class="text-md">SigmaUSD</span> -->
		<sup class="ml-1 mt-1 text-xs text-gray-500">alpha 14</sup>
	</div>

	<div class="flex gap-3" style="height:52px;">
		{#if $web3wallet_connected}
			{#if !pending}
				<div class="flex gap-1">
					<div class="text-right">
						<div class="text-xl text-gray-500">1000</div>
						<div>+100</div>
					</div>
					<div class="text-xl text-gray-500">ERG</div>
					<div></div>
				</div>
			{:else}
				<div class="flex items-start gap-2 pt-2 leading-none">
					<div class="flex items-end gap-1">
						<div class="text-right">
							<div class="text-xl text-gray-500">
								{formatAmount(
									$web3wallet_confirmedTokens.find((x) => x.tokenId == SigRSV_TOKEN_ID)?.amount,
									false
								)}
							</div>
						</div>
						<div class="text-sm text-gray-500" style="padding-bottom:1.5px;">SigRSV</div>
					</div>
					<div class="flex items-end gap-1">
						<div class="text-right">
							<div class="text-xl text-gray-500">
								{centsToUsd(
									$web3wallet_confirmedTokens.find((x) => x.tokenId == SigUSD_TOKEN_ID)?.amount
								)}
							</div>
						</div>
						<div class="text-sm text-gray-500" style="padding-bottom:1.5px;">SigUSD</div>
					</div>
					<div class="flex items-end gap-1">
						<div class="text-right">
							<div class="text-xl text-gray-500">
								{nanoErgToErg(
									$web3wallet_confirmedTokens.find((x) => x.tokenId == ERGO_TOKEN_ID)?.amount
								)}
							</div>
						</div>
						<div class="text-sm text-gray-500" style="padding-bottom:1.5px;">ERG</div>
					</div>
				</div>
			{/if}
		{/if}
		<div style="display:none;">
			<ThemeToggle></ThemeToggle>
		</div>

		<ConnectWallet></ConnectWallet>
	</div>
</nav>

<style lang>
	.square {
		background-color: rgb(31 41 55);
		color: rgb(243 244 246);
		color: rgb(177, 177, 177);
		border-radius: 4px;

		display: flex;
		align-items: center;
		justify-content: center;
		height: 38px;
		width: 38px;
	}
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
