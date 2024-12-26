<script>
	import {
		connectWeb3Wallet,
		disconnectWeb3Wallet,
		web3wallet_available_wallets,
		web3wallet_connected,
		web3wallet_wallet_name
	} from './stores/web3wallet';
</script>

{#if $web3wallet_connected}
	<a
		href="#"
		role="menuitem"
		tabindex="-1"
		style=""
		on:click={() => {
			disconnectWeb3Wallet();
		}}>Disconnect {$web3wallet_wallet_name}</a
	>
{:else if $web3wallet_available_wallets.length}
	{#each $web3wallet_available_wallets as wallet}
		<a
			href="#"
			class="text-center"
			role="menuitem"
			tabindex="-1"
			style=""
			on:click={() => {
				connectWeb3Wallet(wallet);
			}}>Connect {wallet}</a
		>
	{/each}
{/if}
