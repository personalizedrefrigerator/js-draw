import { Vec2 } from '@js-draw/math';
import createEditor from '../../testing/createEditor';
import { ToolbarContext } from '../types';
import HelpDisplay from './HelpDisplay';
import sendHtmlSwipe from '../../testing/sendHtmlSwipe';

const createOverlay = (element: HTMLElement) => {
	document.body.appendChild(element);
};

const makeContext = (): ToolbarContext => {
	return createEditor();
};

const createTestHelpDisplay = (testHelpTexts: string[]) => {
	const display = new HelpDisplay(createOverlay, makeContext());

	let elementCounter = 0;
	for (const helpText of testHelpTexts) {
		elementCounter++;

		const testElement = document.createElement('button');
		testElement.innerText = `Test element ${elementCounter}`;
		testElement.classList.add(`test-element-${elementCounter}`);

		display.registerTextHelpForElement(testElement, helpText);
	}

	// Show now so that related elements can be returned.
	display.showHelpOverlay();

	const overlayElementMatches = document.querySelectorAll<HTMLElement>('.toolbar-help-overlay');
	expect(overlayElementMatches).toHaveLength(1);
	const helpOverlay = overlayElementMatches[0];

	const nextButton = helpOverlay.querySelector<HTMLButtonElement>('.navigation-buttons > button.next')!;
	expect(nextButton).not.toBeFalsy();

	const previousButton = helpOverlay.querySelector<HTMLButtonElement>('.navigation-buttons > button.previous')!;
	expect(previousButton).not.toBeFalsy();

	const closeButton = helpOverlay.querySelector<HTMLButtonElement>('.close-button')!;
	expect(closeButton).not.toBeFalsy();

	return {
		display,
		helpOverlay,
		nextButton,
		previousButton,
		closeButton,

		// The label may be re-created, so we re-query it each time it's needed.
		getLabel: () => {
			const labelMatches = helpOverlay.querySelectorAll('.help-page-container .current-item-help');
			expect(labelMatches).toHaveLength(1);
			return labelMatches[0] as HTMLElement;
		},
	};
};

describe('HelpDisplay', () => {
	afterEach(() => {
		// Clean up any open dialogs, etc.
		document.body.replaceChildren();
	});

	test('should show help registered for just the current element', async () => {
		const { helpOverlay, getLabel, closeButton, nextButton, previousButton } = createTestHelpDisplay(
			[ 'Help text here...', 'Help text 2' ]
		);

		// Should show the help text for the first item
		expect(getLabel().innerText).toMatch('Help text here...');

		// Clicking "next" should move to the next item
		nextButton.click();

		// Should now have the help text for the second element
		expect(getLabel().innerText).toBe('Help text 2');

		nextButton.click();

		// Should still just have the help text for the second element
		expect(getLabel().innerText).toBe('Help text 2');

		// May have additional instructions (so just match the start)
		previousButton.click();
		expect(getLabel().innerText).toBe('Help text here...');

		// Should stay on the first
		previousButton.click();
		expect(getLabel().innerText).toBe('Help text here...');

		// Should still be in the document
		expect(helpOverlay.parentElement).not.toBeFalsy();

		// Should close when clicking close
		closeButton.click();

		// Wait for animations
		await jest.advanceTimersByTimeAsync(500);
		expect(helpOverlay.parentElement).toBeFalsy();
	});

	test('dragging the dialog background should transition between items', async () => {
		const { helpOverlay, getLabel } = createTestHelpDisplay(
			[ 'Item 1', 'Item 2', 'Item 3' ]
		);

		expect(getLabel().innerText).toBe('Item 1');

		// Swipe from right to left
		await sendHtmlSwipe(helpOverlay, Vec2.of(50, 50), Vec2.of(0, 50));
		expect(getLabel().innerText).toBe('Item 2');

		// Swipe to the first again
		await sendHtmlSwipe(helpOverlay, Vec2.of(50, 50), Vec2.of(100, 60));
		expect(getLabel().innerText).toBe('Item 1');

		// Shouldn't be possible to swipe before the first item
		await sendHtmlSwipe(helpOverlay, Vec2.of(50, 50), Vec2.of(1000, 60));
		expect(getLabel().innerText).toBe('Item 1');

		await sendHtmlSwipe(helpOverlay, Vec2.of(150, 50), Vec2.of(100, 30));
		expect(getLabel().innerText).toBe('Item 2');

		// Small swipes should do nothing
		await sendHtmlSwipe(helpOverlay, Vec2.of(50, 50), Vec2.of(35, 50));
		expect(getLabel().innerText).toBe('Item 2');

		// Swipes should work even with a large vertical component
		await sendHtmlSwipe(helpOverlay, Vec2.of(150, 50), Vec2.of(10, 0));
		expect(getLabel().innerText).toBe('Item 3');

		// Should not be possible to swipe past the last item.
		await sendHtmlSwipe(helpOverlay, Vec2.of(150, 50), Vec2.of(10, 100));
		expect(getLabel().innerText).toBe('Item 3');

		// Should be possible to swipe back
		await sendHtmlSwipe(helpOverlay, Vec2.of(50, 50), Vec2.of(100, 60));
		expect(getLabel().innerText).toBe('Item 2');
	});
});
