<script lang="ts">
	import ConnectWallet from './ConnectWallet.svelte';
	import { ERGO_TOKEN_ID, SigRSV_TOKEN_ID, SigUSD_TOKEN_ID } from './stores/ergoTokens';
	import { web3wallet_confirmedTokens, web3wallet_connected } from './stores/web3wallet';
	import ThemeToggle from './ThemeToggle.svelte';
	import { centsToUsd, formatAmount, nanoErgToErg } from './utils';
	import { onMount } from 'svelte';

	let pending = true;
	let letters = 'ERGFI'.split('');
	let selectedColors: Record<string, boolean> = {};

	onMount(() => {
		const storedColors = localStorage.getItem('selectedColors');
		if (storedColors) {
			selectedColors = JSON.parse(storedColors);
		}
	});

	function toggleColor(letter: string) {
		selectedColors[letter] = !selectedColors[letter];
		localStorage.setItem('selectedColors', JSON.stringify(selectedColors));
	}

	type Girl = { img: number; bg: string; text?: string };

	const girls: Girl[] = [
		{ img: 1071, bg: '#EACCFE', text: '#444' },
		{ img: 1087, bg: '#BFC2C9', text: '#444' },
		{ img: 1153, bg: '#F6F2A9', text: '#444' },
		{ img: 1360, bg: '#E39EF7', text: '#444' },
		{ img: 1426, bg: '#F7E0C1', text: '#444' },
		{ img: 1465, bg: '#FFD600', text: '#444' },
		{ img: 1472, bg: '#DD143B', text: '#f0f0f0' },
		{ img: 1475, bg: '#D5F6FB', text: '#444' },
		{ img: 1494, bg: '#03890E', text: '#f0f0f0' },
		{ img: 1499, bg: '#565C50', text: '#f0f0f0' },
		{ img: 632, bg: '#A42BC4', text: '#f0f0f0' },
		{ img: 641, bg: '#F7B9D2', text: '#444' },
		{ img: 651, bg: '#FB7F73', text: '#444' },
		{ img: 719, bg: '#F7E0C1', text: '#444' },
		{ img: 822, bg: '#A1512C', text: '#f0f0f0' },
		{ img: 858, bg: '#BEDDF1', text: '#444' },
		{ img: 863, bg: '#D1FEB9', text: '#444' },
		{ img: 990, bg: '#48AAAD', text: '#f0f0f0' }
	];

	function setbg(girl: Girl) {
		if (girl.text) document.documentElement.style.setProperty('--cl-text', girl.text);
		if (girl.text) document.documentElement.style.setProperty('--cl-contrast-text', girl.text);
		document.documentElement.style.setProperty('--cl-bg', girl.bg);
		document.documentElement.style.setProperty('--cl-bg-widget', girl.bg);
		document.documentElement.style.setProperty('--cl-bg-alpha', `${girl.bg}ED`);
		const element = document.querySelector('.powwowgirl-bg') as HTMLElement;
		if (element) {
			element.style.backgroundImage = `url('/powwowgirls/mono/${girl.img}.png')`;
		}
	}
</script>

<nav class="sticky top-0 flex items-center justify-between px-6 py-3">
	<div class="flex items-start text-gray-300">
		<span class="flex gap-1 text-xl font-medium">
			{#each letters as letter}
				<button
					class="square"
					on:click={() => toggleColor(letter)}
					style="background-color: {selectedColors[letter]
						? '#f77315'
						: 'var(--cl-text)'}; color: {selectedColors[letter] ? 'black' : 'var(--cl-bg)'}"
				>
					{letter}
				</button>
			{/each}
		</span>
		<sup class="ml-1 mt-1 text-xs text-gray-500">alpha 14</sup>
	</div>

	<div class="flex gap-1">
		{#each girls as girl}
			<button on:click={() => setbg(girl)}>
				{girl.img}
				<img src="/powwowgirls/mono/{girl.img}.png" alt="" style="width:40px;height:40px" />
			</button>
		{/each}
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
				<div class="flex items-center gap-2 leading-none">
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
		color: rgb(177, 177, 177);
		border-radius: 4px;

		display: flex;
		align-items: center;
		justify-content: center;
		height: 38px;
		width: 38px;
		cursor: pointer;
		user-select: none;
		transition:
			background-color 0.2s,
			color 0.2s;
	}
	.square:hover {
		background-color: #f77315;
		color: white;
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
