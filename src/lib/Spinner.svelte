<script>
	export let size = 16;
</script>

<span
	class="loader"
	style="
		width: {size}px; 
		height: {size}px; 
		border-width: {Math.round(size / 10)}px; 
		border-color: currentColor;"
></span>

<style>
	.loader {
		border-style: dotted;
		border-radius: 50%;
		display: inline-block;
		position: relative;
		box-sizing: border-box;
		animation: rotation 2s linear infinite;
	}

	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
