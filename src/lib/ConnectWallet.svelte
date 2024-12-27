<script lang="ts">
	import { ERGO_TOKEN_ID } from './stores/ergoTokens';
	import {
		connectWeb3Wallet,
		disconnectWeb3Wallet,
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_connected,
		web3wallet_wallet_name
	} from './stores/web3wallet';
	import { nanoErgToErg } from './utils';
</script>

<div class="w-wallet group relative">
	{#if $web3wallet_connected}
		<button
			class="w-wallet text-md rounded-md bg-gray-200 px-6 py-2 text-gray-300 shadow-md transition hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
		>
			{nanoErgToErg($web3wallet_confirmedTokens.find((x) => x.tokenId == ERGO_TOKEN_ID)?.amount)} ERG
		</button>
		<div
			class="w-wallet absolute right-0 hidden w-48 rounded-md bg-gray-800 shadow-lg group-hover:block"
		>
			<ul class="divide-y divide-gray-700">
				<li class="px-4 hover:bg-gray-700">
					<a
						href="#"
						role="menuitem"
						class="text-md flex justify-between gap-2 rounded-md py-2 transition"
						tabindex="-1"
						style=""
						on:click={() => {
							disconnectWeb3Wallet();
						}}
						>Disconnect
						{#if $web3wallet_wallet_name == 'nautilus'}
							<img
								src="https://sigmafi.app/assets/nautilus-BfkGomjP.svg"
								alt="Nautilus Icon"
								class="h-6 w-6"
							/>
						{/if}
						{#if $web3wallet_wallet_name == 'safew'}
							<!-- svelte-ignore a11y_missing_attribute -->
							<img
								data-v-1f050cd1=""
								src="data:image/png;base64,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"
								class="h-5 w-5"
							/>
						{/if}
					</a>
				</li>
			</ul>
		</div>
	{:else if $web3wallet_available_wallets.length}
		<button
			class="w-wallet text-md rounded-md bg-gray-200 px-6 py-2 text-gray-300 shadow-md transition hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
		>
			CONNECT WALLET
		</button>
		<div
			class="w-wallet absolute right-0 hidden w-48 rounded-md bg-gray-800 shadow-lg group-hover:block"
		>
			<ul class="divide-y divide-gray-700">
				{#each $web3wallet_available_wallets as wallet}
					<li class="px-4 py-2 hover:bg-gray-700">
						<button
							class="flex w-full cursor-pointer items-center justify-between"
							on:click={() => {
								connectWeb3Wallet(wallet);
							}}
						>
							<span class="text-gray-300">{wallet.charAt(0).toUpperCase() + wallet.slice(1)}</span>
							{#if wallet == 'nautilus'}
								<img
									src="https://sigmafi.app/assets/nautilus-BfkGomjP.svg"
									alt="Nautilus Icon"
									class="h-6 w-6"
								/>
							{/if}
							{#if wallet == 'safew'}
								<!-- svelte-ignore a11y_missing_attribute -->
								<img
									data-v-1f050cd1=""
									src="data:image/png;base64,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"
									class="h-5 w-5"
								/>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.w-wallet {
		width: 200px;
	}
</style>
