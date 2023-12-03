import { Rect2, Vec2 } from '@js-draw/math';
import { ToolbarContext } from '../types';
import makeDraggable from './makeDraggable';
import { MutableReactiveValue } from '../../util/ReactiveValue';
import cloneElementWithStyles from '../../util/cloneElementWithStyles';
import addLongPressOrHoverCssClasses from '../../util/addLongPressOrHoverCssClasses';

interface HelpRecord {
	readonly targetElements: HTMLElement[];
	readonly helpText: string;
}

const createHelpPage = (
	helpItems: HelpRecord[],
	onItemClick: (itemIndex: number)=>void,
	onBackgroundClick: ()=>void,
) => {
	const container = document.createElement('div');
	container.classList.add('help-page-container');

	const textLabel = document.createElement('div');
	textLabel.classList.add('label', '-space-above');

	// The current active item in helpItems.
	// (Only one item is active at a time, but each item can have multiple HTMLElements).
	let currentItemIndex = 0;
	let currentItem: HelpRecord|null = helpItems[0] ?? null;

	// Each help item can have multiple associated elements. We store clones of each
	// of these elements in their own container.
	//
	// clonedElementContainers maps from help item indicies to **arrays** of containers.
	//
	// For example, clonedElementContainers would be
	//   [ [ Container1, Container2 ], [ Container3 ], [ Container4 ]]
	//       ↑                            ↑              ↑
	//       HelpItem 1                   HelpItem 2     HelpItem 3
	// if the first help item had two elements (and thus two cloned element containers).
	//
	// We also store the original bounding box -- the bounding box of the clones can change
	// while dragging to switch pages.
	let clonedElementContainers: { container: HTMLElement, bbox: Rect2 }[][] = [];

	// Clicking on the background of the help area should send an event (e.g. to allow the
	// help container to be closed).
	container.addEventListener('click', event => {
		// If clicking directly on the container (and not on a child)
		if (event.target === container) {
			onBackgroundClick();
		}
	});

	// Returns the combined bounding box of all elements associated with the currentItem
	// (all active help items).
	const getCombinedBBox = () => {
		if (!currentItem) {
			return Rect2.empty;
		}

		const itemBoundingBoxes = currentItem.targetElements.map(
			element => Rect2.of(element.getBoundingClientRect())
		);
		return Rect2.union(...itemBoundingBoxes);
	};

	// Updates each cloned element's click listener and CSS classes based on whether
	// that element is the current focused element.
	const updateClonedElementStates = () => {
		const currentItemBBox = getCombinedBBox();
		for (let index = 0; index < clonedElementContainers.length; index++) {
			for (const { container, bbox: containerBBox } of clonedElementContainers[index]) {
				if (index === currentItemIndex) {
					container.classList.add('-active');
					container.classList.remove('-clickable', '-background');
					container.removeAttribute('aria-hidden');
					container.onclick = () => {};
				}
				// Otherwise, if not containing the current element
				else if (!containerBBox.containsRect(currentItemBBox)) {
					container.classList.add('-clickable');
					container.classList.remove('-active', '-background');
					container.setAttribute('aria-hidden', 'true');

					const containerIndex = index;
					container.onclick = () => {
						onItemClick(containerIndex);
					};
				} else {
					container.classList.add('-background');
					container.classList.remove('-active', '-clickable');
					container.setAttribute('aria-hidden', 'true');
					container.onclick = () => {};
				}
			}
		}
	};

	// Ensures that the item label doesn't overlap the current help item's cloned element.
	const updateLabelPosition = () => {
		const labelBBox = Rect2.of(textLabel.getBoundingClientRect());
		const combinedBBox = getCombinedBBox();

		if (labelBBox.intersects(combinedBBox)) {
			const containerBBox = Rect2.of(container.getBoundingClientRect());

			const spaceAboveCombined = combinedBBox.topLeft.y;
			const spaceBelowCombined = containerBBox.bottomLeft.y - combinedBBox.bottomLeft.y;

			if (spaceAboveCombined > spaceBelowCombined && spaceAboveCombined > labelBBox.height / 3) {
				// Push to the very top
				textLabel.classList.remove('-small-space-above', '-large-space-above');
				textLabel.classList.add('-large-space-below');
			}

			if (spaceAboveCombined < spaceBelowCombined && spaceBelowCombined > labelBBox.height) {
				// Push to the very bottom
				textLabel.classList.add('-large-space-above');
				textLabel.classList.remove('-large-space-below');
			}
		}
	};

	const refreshContent = () => {
		container.replaceChildren();

		const screenBBox = new Rect2(0, 0, window.innerWidth, window.innerHeight);

		clonedElementContainers = [];
		for (let itemIndex = 0; itemIndex < helpItems.length; itemIndex++) {
			const item = helpItems[itemIndex];
			const itemCloneContainers = [];

			for (const targetElement of item.targetElements) {
				let targetBBox = Rect2.of(targetElement.getBoundingClientRect());

				// Move the element onto the screen if not visible
				if (!screenBBox.containsRect(targetBBox)) {
					const bottomCenter = screenBBox.bottomLeft.lerp(screenBBox.bottomRight, 0.5);
					const delta = bottomCenter.minus(targetBBox.center);
					targetBBox = targetBBox.translatedBy(delta);
				}

				const clonedElement = cloneElementWithStyles(targetElement);

				// Interacting with the clone won't trigger event listeners, so disable
				// all inputs.
				for (const input of clonedElement.querySelectorAll('input')) {
					input.disabled = true;
				}

				clonedElement.style.margin = '0';

				const clonedElementContainer = document.createElement('div');
				clonedElementContainer.classList.add('cloned-element-container');
				clonedElementContainer.style.position = 'absolute';
				clonedElementContainer.style.left = `${targetBBox.topLeft.x}px`;
				clonedElementContainer.style.top = `${targetBBox.topLeft.y}px`;

				clonedElementContainer.replaceChildren(clonedElement);

				addLongPressOrHoverCssClasses(clonedElementContainer, { timeout: 0 });

				itemCloneContainers.push({ container: clonedElementContainer, bbox: targetBBox });
				container.appendChild(clonedElementContainer);
			}

			clonedElementContainers.push(itemCloneContainers);
		}

		updateClonedElementStates();

		textLabel.classList.remove('-large-space-above');
		textLabel.classList.add('-small-space-above', '-large-space-below');
		container.appendChild(textLabel);
	};

	const refresh = () => {
		refreshContent();
		updateLabelPosition();
	};

	const onItemChange = () => {
		textLabel.innerText = currentItem?.helpText ?? '';

		updateClonedElementStates();
	};
	onItemChange();

	return {
		addToParent: (parent: HTMLElement) => {
			refreshContent();
			parent.appendChild(container);
			updateLabelPosition();
		},
		refresh,
		setPageIndex: (pageIndex: number) => {
			currentItemIndex = pageIndex;
			currentItem = helpItems[pageIndex];
			onItemChange();
		},
	};
};

export default class HelpDisplay {
	#helpData: HelpRecord[] = [];

	public constructor(
		private createOverlay: (htmlElement: HTMLElement)=>void,
		private context: ToolbarContext,
	) {
	}

	private showHelpOverlay() {
		const overlay = document.createElement('dialog');
		overlay.setAttribute('autofocus', 'true');
		overlay.classList.add('toolbar-help-overlay');

		let lastDragTimestamp = 0;
		const onBackgroundClick = () => {
			const wasJustDragging = performance.now() - lastDragTimestamp < 100;
			if (!wasJustDragging) {
				overlay.close();
			}
		};

		const makeCloseButton = () => {
			const closeButton = document.createElement('button');
			closeButton.classList.add('close-button');
			closeButton.appendChild(this.context.icons.makeCloseIcon());

			const label = this.context.localization.close;
			closeButton.setAttribute('aria-label', label);
			closeButton.setAttribute('title', label);

			closeButton.onclick = () => { overlay.close(); };

			return closeButton;
		};

		const makeNavigationContent = () => {
			const currentPage = MutableReactiveValue.fromInitialValue(0);

			const content = document.createElement('div');
			content.classList.add('navigation-content');

			const helpPage = createHelpPage(
				this.#helpData,
				newPageIndex => currentPage.set(newPageIndex),
				onBackgroundClick,
			);
			helpPage.addToParent(content);

			const showPage = (pageIndex: number) => {
				if (pageIndex >= this.#helpData.length || pageIndex < 0) {
					// Hide if out of bounds
					console.warn('Help screen: Navigated to out-of-bounds page', pageIndex);
					content.style.display = 'none';
				} else {
					content.style.display = '';

					helpPage.setPageIndex(pageIndex);
				}
			};
			currentPage.onUpdateAndNow(showPage);

			const navigationControl = {
				content,
				currentPage,

				toNext: () => {
					if (navigationControl.hasNext()) {
						currentPage.set(currentPage.get() + 1);
					}
				},
				toPrevious: () => {
					if (navigationControl.hasPrevious()) {
						currentPage.set(currentPage.get() - 1);
					}
				},
				hasNext: () => {
					return currentPage.get() + 1 < this.#helpData.length;
				},
				hasPrevious: () => {
					return currentPage.get() > 0;
				},
				refreshCurrent: () => {
					helpPage.refresh();
				},
			};
			return navigationControl;
		};

		const makeNavigationButtons = (navigation: ReturnType<typeof makeNavigationContent>) => {
			const navigationButtonContainer = document.createElement('div');
			navigationButtonContainer.classList.add('navigation-buttons');

			const nextButton = document.createElement('button');
			const previousButton = document.createElement('button');

			nextButton.innerText = this.context.localization.next;
			previousButton.innerText = this.context.localization.previous;

			nextButton.classList.add('next');
			previousButton.classList.add('previous');

			const updateButtonVisibility = () => {
				navigationButtonContainer.classList.remove('-has-next', '-has-previous');

				if (navigation.hasNext()) {
					navigationButtonContainer.classList.add('-has-next');
					nextButton.disabled = false;
				} else {
					navigationButtonContainer.classList.remove('-has-next');
					nextButton.disabled = true;
				}

				if (navigation.hasPrevious()) {
					navigationButtonContainer.classList.add('-has-previous');
					previousButton.disabled = false;
				} else {
					navigationButtonContainer.classList.remove('-has-previous');
					previousButton.disabled = true;
				}
			};
			navigation.currentPage.onUpdateAndNow(updateButtonVisibility);

			nextButton.onclick = () => {
				navigation.toNext();
			};

			previousButton.onclick = () => {
				navigation.toPrevious();
			};

			navigationButtonContainer.replaceChildren(previousButton, nextButton);

			return navigationButtonContainer;
		};

		const navigation = makeNavigationContent();
		const navigationButtons = makeNavigationButtons(navigation);

		overlay.replaceChildren(
			makeCloseButton(),
			navigationButtons,
			navigation.content,
		);

		this.createOverlay(overlay);
		overlay.showModal();

		const minDragOffsetToTransition = 30;
		const setDragOffset = (offset: number) => {
			if (offset > 0 && !navigation.hasPrevious()) {
				offset = 0;
			}

			if (offset < 0 && !navigation.hasNext()) {
				offset = 0;
			}

			// Clamp offset
			if (offset > minDragOffsetToTransition || offset < -minDragOffsetToTransition) {
				offset = minDragOffsetToTransition * Math.sign(offset);
			}

			overlay.style.transform = `translate(${offset}px, 0px)`;

			if (offset >= minDragOffsetToTransition) {
				navigationButtons.classList.add('-highlight-previous');
			} else {
				navigationButtons.classList.remove('-highlight-previous');
			}

			if (offset <= -minDragOffsetToTransition) {
				navigationButtons.classList.add('-highlight-next');
			} else {
				navigationButtons.classList.remove('-highlight-next');
			}
		};


		// Listeners
		const dragListener = makeDraggable(overlay, {
			draggableChildElements: [ navigation.content ],
			onDrag: (_deltaX: number, _deltaY: number, totalDisplacement: Vec2) => {
				overlay.classList.add('-dragging');
				setDragOffset(totalDisplacement.x);
			},
			onDragEnd: (dragStatistics) => {
				overlay.classList.remove('-dragging');
				setDragOffset(0);

				if (!dragStatistics.roughlyClick) {
					const xDisplacement = dragStatistics.displacement.x;

					if (xDisplacement > minDragOffsetToTransition) {
						navigation.toPrevious();
					} else if (xDisplacement < -minDragOffsetToTransition) {
						navigation.toNext();
					}

					lastDragTimestamp = dragStatistics.endTimestamp;
				}
			},
		});

		let resizeObserver: ResizeObserver|null;
		if (window.ResizeObserver) {
			resizeObserver = new ResizeObserver(() => {
				navigation.refreshCurrent();
			});
			resizeObserver.observe(overlay);
		}

		const onMediaChangeListener = () => {
			// Refresh the cloned elements and their styles after a delay.
			// This is necessary because styles are cloned, in addition to elements.
			requestAnimationFrame(() => navigation.refreshCurrent());
		};
		const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQueryList.addEventListener('change', onMediaChangeListener);

		// Close the overlay when clicking on the background (*directly* on any of the
		// elements in closeOverlayTriggers).
		const closeOverlayTriggers = [ navigation.content, navigationButtons, overlay ];
		overlay.onclick = event => {
			if (closeOverlayTriggers.includes(event.target as any)) {
				onBackgroundClick();
			}
		};

		overlay.addEventListener('close', () => {
			mediaQueryList.removeEventListener('change', onMediaChangeListener);
			dragListener.removeListeners();
			resizeObserver?.disconnect();

			overlay.remove();
		});
	}

	/** Marks `helpText` as associated with a single `targetElement`. */
	public registerTextHelpForElement(targetElement: HTMLElement, helpText: string) {
		this.registerTextHelpForElements([ targetElement ], helpText);
	}

	/** Marks `helpText` as associated with all elements in `targetElements`. */
	public registerTextHelpForElements(targetElements: HTMLElement[], helpText: string) {
		this.#helpData.push({ targetElements: [ ...targetElements ], helpText });
	}

	/** Returns true if any help text has been registered. */
	public hasHelpText() {
		return this.#helpData.length > 0;
	}

	/**
	 * Creates and returns a button that toggles the help display.
	 *
	 * @internal
	 */
	public createToggleButton(): HTMLElement {
		const buttonContainer = document.createElement('div');
		buttonContainer.classList.add('toolbar-help-overlay-button');

		const helpButton = document.createElement('button');
		helpButton.classList.add('button');

		const icon = this.context.icons.makeHelpIcon();
		icon.classList.add('icon');
		helpButton.appendChild(icon);

		helpButton.setAttribute('aria-label', this.context.localization.help);

		helpButton.onclick = () => {
			this.showHelpOverlay();
		};

		buttonContainer.appendChild(helpButton);

		return buttonContainer;
	}
}
