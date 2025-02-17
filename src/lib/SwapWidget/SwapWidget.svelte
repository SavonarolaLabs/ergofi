<script lang="ts">
	import { initJsonTestBoxes } from '$lib/stores/dexyGoldStoreJsonTestData';
	import { onMount } from 'svelte';
	import Gear from '../icons/Gear.svelte';
	import Tint from '../icons/Tint.svelte';
	import { getWalletInstallLink } from '../installWallet';
	import PrimaryButton from '../PrimaryButton.svelte';
	import { bank_box, fee_mining, oracle_box } from '../stores/bank';
	import {
		ERGO_TOKEN_ID,
		getTokenId,
		SigRSV_TOKEN_ID,
		SigUSD_TOKEN_ID
	} from '../stores/ergoTokens';
	import { confirmed_interactions, mempool_interactions } from '../stores/preparedInteractions';
	import { selected_contract } from '../stores/ui';
	import {
		web3wallet_available_wallets,
		web3wallet_confirmedTokens,
		web3wallet_wallet_used_addresses
	} from '../stores/web3wallet';
	import SubNumber from '../SubNumber.svelte';
	import {
		inputTicker,
		inputTokenIds,
		isLpTokenInput,
		isLpTokenOutput,
		outputTicker,
		type SwapIntention,
		type SwapItem
	} from '../swapIntention';
	import { amountToValue, centsToUsd, isOwnTx, nanoErgToErg, valueToAmount } from '../utils';
	import Dropdown from './Dropdown.svelte';
	import SwapInputs from './SwapInputs.svelte';
	import {
		ergDexyGoldToLp,
		getOutputOptions,
		inputOptions,
		tokenColor,
		type SwapOption
	} from './swapOptions';
	import {
		getFromLabel,
		getToLabel,
		handleSwapButtonDexyGold,
		handleSwapButtonSigUsd,
		isSwapDisabledCalc,
		recalcPriceAndIntent,
		recalcSigUsdBankAndOracleBoxes,
		updateIntentValues,
		updateSelectedContractStore,
		updateUiValues
	} from './swapWidgetUtils';

	let swapIntent: SwapIntention = ergDexyGoldToLp.intention;
	let lastInputItem: SwapItem;
	selected_contract.set('DexyGold');
	let fromValue = ['', ''];
	let toValue = ['', ''];
	let swapPrice: number = 0.0;
	let selectedInputOption: SwapOption = ergDexyGoldToLp;
	let minerFee = 0.01;
	let showFeeSlider = false;
	let fromDropdownOpen = false;
	let toDropdownOpen = false;

	onMount(() => {
		initJsonTestBoxes();
		oracle_box.subscribe((oracleBox) => {
			recalcSigUsdBankAndOracleBoxes(oracleBox, $bank_box);
			if ($selected_contract == 'SigmaUsd') doRecalc(swapIntent);
		});
		bank_box.subscribe((bankBox) => {
			recalcSigUsdBankAndOracleBoxes($oracle_box, bankBox);
			if ($selected_contract == 'SigmaUsd') doRecalc(swapIntent);
		});
		web3wallet_wallet_used_addresses.subscribe((addr) => {
			if (addr) {
				confirmed_interactions.update((list) =>
					list.map((i) => {
						i.own = isOwnTx(i.tx, addr);
						return i;
					})
				);
				mempool_interactions.update((list) =>
					list.map((i) => {
						i.own = isOwnTx(i.tx, addr);
						return i;
					})
				);
			}
		});
	});

	function doRecalc(swapIntent: SwapIntention, inputItem?: SwapItem) {
		const preview = recalcPriceAndIntent(swapIntent, inputItem);
		if (preview?.price) swapPrice = preview.price;
		if (preview?.calculatedIntent) {
			const swapIntentNew = updateIntentValues(preview?.calculatedIntent);
			updateUiValues(swapIntentNew, fromValue, toValue);
			swapIntent = swapIntentNew;
			toValue = toValue;
			fromValue = fromValue;
		}
	}

	function handleFromValueChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const side = input.dataset.side;
		const ticker = input.dataset.ticker;
		const tokenId = getTokenId(ticker)!;
		const value = input.value;
		const amount = valueToAmount({ tokenId, value });
		lastInputItem = { side, ticker, tokenId, value, amount };
		doRecalc(swapIntent, lastInputItem);
	}

	function handleSwapInputs() {
		const newSwapIntent: SwapIntention = structuredClone(swapIntent);

		swapIntent = newSwapIntent.map((row) => {
			row.side = row.side == 'input' ? 'output' : 'input';
			return row;
		});
		if (lastInputItem) {
			lastInputItem.side = lastInputItem.side == 'input' ? 'output' : 'input';
		}
		updateSelectedContractStore(swapIntent);
		doRecalc(swapIntent, lastInputItem);
	}

	function handleFeeChange(event: Event) {
		const val = (event.target as HTMLInputElement).value;
		fee_mining.set(BigInt(Number(val) * 10 ** 9));
		doRecalc(swapIntent, lastInputItem);
	}

	function handleSelectInputOption(option: SwapOption) {
		fromDropdownOpen = false;
		selectedInputOption = option;
		if (option.intention) {
			swapIntent = structuredClone(option.intention);
		} else {
			const input = structuredClone(option.item);
			const outputItem = structuredClone(getOutputOptions(option)[0].item!);
			outputItem.side = 'output';
			swapIntent = [input, outputItem];
		}
		lastInputItem.side = swapIntent[0].side;
		lastInputItem.tokenId = swapIntent[0].tokenId;
		lastInputItem.ticker = swapIntent[0].ticker;
		lastInputItem.amount = valueToAmount(lastInputItem);
		//swapIntent

		updateSelectedContractStore(swapIntent);
		doRecalc(swapIntent, lastInputItem);
	}

	function handleSelectToOption(i: SwapOption) {
		toDropdownOpen = false;
		if (i.item) {
			let newItem = structuredClone(i.item);
			newItem.side = 'output';
			swapIntent[1] = newItem;
			if (lastInputItem) {
				if (lastInputItem.side == 'input') {
				} else {
					lastInputItem.side = newItem.side;
					lastInputItem.tokenId = newItem.tokenId;
					lastInputItem.ticker = newItem.ticker;
					lastInputItem.amount = valueToAmount(lastInputItem);
				}
			}
		} else {
			if (i.intention) {
			}
		}

		updateSelectedContractStore(swapIntent);
		doRecalc(swapIntent, lastInputItem);
	}

	function handleFromBalanceClick() {
		let newInput: SwapItem = {
			lastInput: true,
			side: swapIntent[0].side,
			tokenId: swapIntent[0].tokenId,
			ticker: swapIntent[0].ticker,
			value: Number.parseFloat(fromBalance.replaceAll(',', '')).toString()
		};
		newInput.amount = valueToAmount(newInput);
		lastInputItem = structuredClone(newInput);
		fromValue[0] = lastInputItem.value;
		doRecalc(swapIntent, lastInputItem);
	}

	// swap button
	let shake = false;

	async function handleSwapButton() {
		const hasLastInput = swapIntent.some((s) => s.lastInput);
		if (isSwapDisabledCalc(swapIntent) || !hasLastInput) {
			shake = true;
			setTimeout(() => {
				shake = false;
			}, 300);
			return;
		}
		if ($selected_contract == 'SigmaUsd') {
			await handleSwapButtonSigUsd(swapIntent);
		} else if ($selected_contract == 'DexyGold') {
			await handleSwapButtonDexyGold(swapIntent);
		}
	}

	//fee
	const toggleFeeSlider = () => {
		showFeeSlider = !showFeeSlider;
	};

	// web3 wallet interaction
	$: fromBalance = (() => {
		const fromToken = inputTicker(swapIntent, 0);
		if (fromToken === 'ERG') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === ERGO_TOKEN_ID)?.amount || 0n;
			return nanoErgToErg(amt);
		} else if (fromToken === 'SigUSD') {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigUSD_TOKEN_ID)?.amount || 0n;
			return centsToUsd(amt);
		} else {
			const amt =
				$web3wallet_confirmedTokens.find((x) => x.tokenId === SigRSV_TOKEN_ID)?.amount || 0n;
			return amt.toString();
		}
	})();

	// dropdowns
	let fromBtnRect = { top: 0, left: 0, width: 0 };
	let toBtnRect = { top: 0, left: 0, width: 0 };

	function toggleFromDropdown(e) {
		e.stopPropagation();
		const rect = e.currentTarget.getBoundingClientRect();
		fromBtnRect = { top: rect.bottom, left: rect.left, width: rect.width };
		fromDropdownOpen = !fromDropdownOpen;
		toDropdownOpen = false;
	}

	function toggleToDropdown(e) {
		e.stopPropagation();
		const rect = e.currentTarget.getBoundingClientRect();
		toBtnRect = { top: rect.bottom, left: rect.left, width: rect.width };
		toDropdownOpen = !toDropdownOpen;
		fromDropdownOpen = false;
	}
</script>

<div class="relative text-[var(--cl-contrast-text)]" class:shake>
	<div
		class="mx-auto w-full max-w-md rounded-tl-xl rounded-tr-xl border-4
		{!shake ? 'border-[var(--cl-border)]' : 'border-[var(--cl-border-error)]'}"
	>
		<div
			class="flex flex-col rounded-tl-xl rounded-tr-lg bg-[var(--cl-bg-alpha)] transition-all"
			class:justify-between={inputTokenIds(swapIntent).length > 1}
			style={swapIntent.length > 2 ? 'min-height:258px' : 'min-height:200px'}
		>
			<div>
				<div class="rounded-md rounded-bl-none">
					<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
						<span class="text-sm">{getFromLabel(swapIntent)}</span>
						<button
							class="hover: flex items-center gap-1 text-sm"
							on:click={handleFromBalanceClick}
						>
							{#if isLpTokenOutput(swapIntent)}
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[0].ticker}</span
								>
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[1].ticker}</span
								>
							{:else if typeof fromBalance === 'number'}
								{fromBalance.toLocaleString('en-US', {
									minimumFractionDigits: 0,
									maximumFractionDigits: 2
								})}
							{:else}
								<span class="font-normal">{fromBalance}</span>
								<span class="font-thin"
									>{swapIntent.filter((i) => i.side == 'input')[0].ticker}</span
								>
							{/if}
						</button>
					</div>
					<div
						class="relative flex flex-col focus-within:ring-1 focus-within:ring-blue-500"
						style="border: none!important; outline: none!important; box-shadow: none!important; max-height: 
						{swapIntent.filter((i) => 'input' == i.side).length == 1 ? '58px' : '116px'}; "
					>
						<div class="flex" style="border-bottom: 4px solid var(--cl-border)">
							<input
								type="number"
								style=""
								class="w-[256px] bg-transparent text-3xl outline-none"
								placeholder="0"
								min="0"
								data-side="input"
								data-ticker={swapIntent.filter((i) => i.side == 'input')[0].ticker}
								bind:value={fromValue[0]}
								on:input={handleFromValueChange}
							/>
							<button
								id="fromDropdownBtn"
								type="button"
								style="width:271px; border-right:none; margin-bottom:-4px; border-width:4px;  height:62px;"
								class="border-color flex w-full items-center justify-between rounded-lg rounded-bl-none rounded-br-none rounded-tr-none px-3 py-2 font-medium outline-none"
								on:click|stopPropagation={toggleFromDropdown}
							>
								{#if isLpTokenInput(swapIntent)}
									<div class="flex items-center gap-3">
										<div class="text-lg text-blue-300"><Tint></Tint></div>
										<div class=" leading-0 flex w-full flex-col justify-center text-xs">
											<div>Liquidity</div>
											<div>Token</div>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3">
										<div
											class="h-5 w-5 {tokenColor(
												swapIntent.find((i) => 'input' == i.side)!.ticker
											)} rounded-full"
										></div>
										{swapIntent.filter((i) => i.side == 'input')[0].ticker}
									</div>
								{/if}
								{#if swapIntent.filter((i) => 'input' == i.side).length == 1}
									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={'currentColor'}
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								{/if}
							</button>
						</div>
						{#if swapIntent.filter((i) => i.side == 'input').length > 1}
							<div class="flex" style="border-bottom:4px solid var(--cl-border);">
								<div>
									<input
										type="number"
										class="h-full w-[256px] bg-transparent text-3xl outline-none"
										placeholder="0"
										min="0"
										bind:value={fromValue[1]}
										data-side="input"
										data-ticker={swapIntent.filter((i) => i.side == 'input')[1].ticker}
										on:input={handleFromValueChange}
									/>
								</div>
								<button
									id="fromDropdownBtn2"
									type="button"
									style="height:62px; border-left: 4px solid var(--cl-border);"
									class="flex w-full items-center justify-between px-3 py-2 font-medium outline-none"
									on:click|stopPropagation={toggleFromDropdown}
								>
									<div class="flex items-center gap-3">
										<div
											class="h-5 w-5 {tokenColor(
												swapIntent.filter((i) => i.side == 'input')[1].ticker
											)} rounded-full"
										></div>
										{swapIntent.filter((i) => i.side == 'input')[1].ticker}
									</div>
									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill={'currentColor'}
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
				<SwapInputs
					top={inputTokenIds(swapIntent).length > 1 ? -5 : -13}
					on:swap={handleSwapInputs}
				/>
			</div>
			<div class="">
				<div class="mb-2 flex justify-between px-3 pl-4 pr-4 pt-3">
					<span class="flex gap-1 text-sm" class:text-red-500={isSwapDisabledCalc(swapIntent)}>
						{getToLabel(swapIntent)}</span
					>
					<span class="text-sm">
						{#if outputTicker(swapIntent, 0) === 'SigRSV' || inputTicker(swapIntent, 0) === 'SigRSV'}
							<SubNumber value={1 / swapPrice}></SubNumber>
						{:else if inputTicker(swapIntent, 0) === 'ERG' && outputTicker(swapIntent, 0) === 'DexyGold'}
							1 {inputTicker(swapIntent, 0)} ≈ <SubNumber value={10 ** 9 / swapPrice}></SubNumber>
							{outputTicker(swapIntent, 0)}
						{:else if inputTicker(swapIntent, 0) === 'DexyGold' && outputTicker(swapIntent, 0) === 'ERG'}
							1 {inputTicker(swapIntent, 0)} ≈ <SubNumber value={swapPrice / 10 ** 9}></SubNumber>
							{outputTicker(swapIntent, 0)}
						{:else}
							<SubNumber value={swapPrice}></SubNumber>
						{/if}
					</span>
				</div>
				<div
					class="relative flex flex-col rounded-lg rounded-bl-none focus-within:ring-1 focus-within:ring-blue-500"
					style="border: none!important; outline: none!important; box-shadow: none!important; max-height: {swapIntent.filter(
						(i) => 'output' == i.side
					).length == 1
						? '58px'
						: '116px'}; "
				>
					<div class="flex">
						<input
							type="number"
							class="w-[256px] bg-transparent text-3xl outline-none"
							placeholder="0"
							min="0"
							bind:value={toValue[0]}
							data-side="output"
							data-ticker={swapIntent.filter((i) => i.side == 'output')[0].ticker}
							on:input={handleFromValueChange}
						/>
						<button
							id="toDropdownBtn"
							type="button"
							style="width: 271px; border-right:none; margin-bottom:-4px; border-width:4px; border-bottom-left-radius:0; border-top-right-radius:0px; height:62px;"
							class=" border-color flex w-full items-center justify-between rounded-lg rounded-br-none px-3 py-2 font-medium outline-none"
							disabled={getOutputOptions({ intention: swapIntent }).length < 2}
							on:click|stopPropagation={toggleToDropdown}
						>
							{#if isLpTokenOutput(swapIntent)}
								<div class="flex items-center gap-3">
									<div class="text-lg text-blue-300"><Tint></Tint></div>
									<div class=" leading-0 flex w-full flex-col justify-center text-xs">
										<div>Liquidity</div>
										<div>Token</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<div
										class="h-5 w-5 {tokenColor(
											swapIntent.filter((i) => i.side == 'output')[0].ticker
										)} rounded-full"
									></div>
									{swapIntent.filter((i) => i.side == 'output')[0].ticker}
								</div>
							{/if}
							{#if getOutputOptions({ intention: swapIntent }).length > 1}
								<svg
									class="pointer-events-none ml-2 h-6 w-6"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M12 15.5l-6-6h12l-6 6z" />
								</svg>
							{/if}
						</button>
					</div>
					{#if swapIntent.filter((i) => i.side == 'output').length > 1}
						<div class="flex">
							<div style="border-top-width:4px;" class="border-color w-[256px]">
								<input
									type="number"
									class="h-full w-[256px] bg-transparent text-3xl outline-none"
									placeholder="0"
									min="0"
									bind:value={toValue[1]}
									data-side="output"
									data-ticker={swapIntent.filter((i) => i.side == 'output')[1].ticker}
									on:input={handleFromValueChange}
								/>
							</div>
							<button
								id="toDropdownBtn2"
								type="button"
								style="height:62px; border-left: 4px solid var(--cl-border)"
								class="flex w-full items-center justify-between px-3 font-medium outline-none"
								on:click|stopPropagation={toggleToDropdown}
								disabled={getOutputOptions({ intention: swapIntent }).length < 2}
							>
								<div class="flex items-center gap-3">
									<div
										class="h-5 w-5 {tokenColor(
											swapIntent.filter((i) => i.side == 'output')[1].ticker
										)} rounded-full"
									></div>
									{swapIntent.filter((i) => i.side == 'output')[1].ticker}
								</div>
								{#if getOutputOptions({ intention: swapIntent }).length > 1}
									<svg
										class="pointer-events-none ml-2 h-6 w-6"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M12 15.5l-6-6h12l-6 6z" />
									</svg>
								{/if}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
		<div
			class={` overflow-hidden transition-all duration-300 ${
				showFeeSlider ? 'max-h-24 py-4' : 'max-h-0'
			}`}
		>
			<input
				type="range"
				min="0.01"
				max="1"
				step="0.01"
				bind:value={minerFee}
				on:change={handleFeeChange}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
			/>
			<div class="mt-2 text-center text-sm">
				Miner Fee: {minerFee.toFixed(2)} ERG
			</div>
		</div>
	</div>
	{#if $web3wallet_available_wallets.length == 0}
		<a
			target="_blank"
			href={getWalletInstallLink()}
			class="flex w-full justify-center rounded-lg bg-orange-600 py-3 font-medium hover:bg-orange-500"
		>
			Install Wallet
		</a>
	{:else}
		<div class="flex">
			<button
				style="display:none"
				on:click={toggleFeeSlider}
				class="mr-1 rounded-lg bg-gray-500 px-4 py-3 font-medium text-gray-200 hover:bg-gray-100 hover:text-black"
			>
				<Gear></Gear>
			</button>
			<PrimaryButton
				onClick={handleSwapButton}
				text="Swap_"
				bgColor={'#F87315'}
				subtext={$selected_contract}
			></PrimaryButton>
		</div>
	{/if}
</div>

{#if fromDropdownOpen}
	<Dropdown
		id="dropdownMenu1"
		btnRect={fromBtnRect}
		options={inputOptions}
		onSelect={handleSelectInputOption}
		open={fromDropdownOpen}
		onClose={() => (fromDropdownOpen = false)}
	/>
{/if}
{#if toDropdownOpen}
	<Dropdown
		id="dropdownMenu2"
		btnRect={toBtnRect}
		options={getOutputOptions(selectedInputOption)}
		onSelect={handleSelectToOption}
		open={toDropdownOpen}
		onClose={() => (toDropdownOpen = false)}
	/>
{/if}

<style>
</style>
