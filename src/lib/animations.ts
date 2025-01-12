import type { Interaction } from './stores/preparedInteractions';

export function applyAnimation(
	node: HTMLElement,
	{ interaction, duration }: { interaction: Interaction; duration: number }
): {
	duration: number;
	tick: (t: number) => void;
} | void {
	if (interaction.confirmed) {
		return blinkThreeTimes(node, { duration });
	} else if (interaction.rejected) {
		return rejectShake(node, { duration });
	} else {
		// Immediately make the element disappear without animation
		node.style.opacity = '0';
		node.style.transition = 'none';
	}
}

export function blinkThreeTimes(
	node: HTMLElement,
	{ duration }: { duration: number }
): {
	duration: number;
	tick: (t: number) => void;
} {
	function applyColorToAllElements(element: HTMLElement, color: string) {
		element.style.setProperty('color', color, 'important');
		Array.from(element.children).forEach((child) =>
			applyColorToAllElements(child as HTMLElement, color)
		);
	}

	applyColorToAllElements(node, 'green');

	const keyframes: Keyframe[] = [
		{ opacity: 1 },
		{ opacity: 0 },
		{ opacity: 1 },
		{ opacity: 0 },
		{ opacity: 1 },
		{ opacity: 0 },
		{ opacity: 1 }
	];

	const animation = node.animate(keyframes, {
		duration,
		easing: 'ease-in-out'
	});

	return {
		duration,
		tick: (t: number) => (animation.currentTime = (1 - t) * duration)
	};
}

export function rejectShake(
	node: HTMLElement,
	{ duration }: { duration: number }
): {
	duration: number;
	tick: (t: number) => void;
} {
	function applyColorToAllElements(element: HTMLElement, color: string) {
		element.style.setProperty('color', color, 'important');
		Array.from(element.children).forEach((child) =>
			applyColorToAllElements(child as HTMLElement, color)
		);
	}

	applyColorToAllElements(node, 'red');

	const keyframes: Keyframe[] = [
		{ transform: 'translateX(0)', offset: 0 },
		{ transform: 'translateX(-10px)', offset: 0.1 },
		{ transform: 'translateX(10px)', offset: 0.2 },
		{ transform: 'translateX(-10px)', offset: 0.3 },
		{ transform: 'translateX(10px)', offset: 0.4 },
		{ transform: 'translateX(0)', offset: 0.5 }
	];

	const animation = node.animate(keyframes, {
		duration,
		easing: 'ease-in-out'
	});

	return {
		duration,
		tick: (t: number) => (animation.currentTime = (1 - t) * duration)
	};
}
