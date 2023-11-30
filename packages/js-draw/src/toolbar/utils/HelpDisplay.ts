import { Rect2, Vec2 } from '@js-draw/math';
import { ToolbarContext } from '../types';
import makeDraggable from './makeDraggable';
import { MutableReactiveValue } from '../../util/ReactiveValue';
import cloneElementWithStyles from '../../util/cloneElementWithStyles';

interface HelpRecord {
	readonly targetElements: HTMLElement[];
	readonly helpText: string;
}

const createHelpPage = (items: HelpRecord[], onItemClick: (itemIndex: number)=>void) => {
	const container = document.createElement('div');
	container.classList.add('help-page-container');

	const textLabel = document.createElement('div');
	textLabel.classList.add('label', '-space-above');

	let currentItem: HelpRecord|null = items[0] ?? null;

	const onItemChange = () => {
		textLabel.innerText = currentItem?.helpText ?? '';
	};
	onItemChange();

	const getCombinedBBox = () => {
		if (!currentItem) {
			return Rect2.empty;
		}

		const itemBoundingBoxes = currentItem.targetElements.map(
			element => Rect2.of(element.getBoundingClientRect())
		);
		return Rect2.union(...itemBoundingBoxes);
	};

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

		const currentBBox = getCombinedBBox();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			for (const targetElement of item.targetElements) {
				const targetBBox = Rect2.of(targetElement.getBoundingClientRect());

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

				if (item === currentItem) {
					clonedElementContainer.classList.add('-active');
				}
				// Otherwise, if not containing the current element
				else if (!targetBBox.containsRect(currentBBox)) {
					clonedElementContainer.classList.add('-clickable');
					clonedElementContainer.setAttribute('aria-hidden', 'true');

					const index = itemIndex;
					clonedElementContainer.onclick = () => {
						onItemClick(index);
					};
				}

				container.appendChild(clonedElementContainer);
			}
		}

		textLabel.classList.remove('-large-space-above');
		textLabel.classList.add('-small-space-above', '-large-space-below');
		container.appendChild(textLabel);
	};

	const refresh = () => {
		refreshContent();
		updateLabelPosition();
	};

	return {
		addToParent: (parent: HTMLElement) => {
			refreshContent();
			parent.appendChild(container);
			updateLabelPosition();
		},
		refresh,
		setPageIndex: (pageIndex: number) => {
			currentItem = items[pageIndex];
			onItemChange();
			refresh();
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
				this.#helpData, newPageIndex => currentPage.set(newPageIndex)
			);
			helpPage.addToParent(content);

			const showPage = (pageIndex: number) => {
				if (pageIndex >= this.#helpData.length || pageIndex < 0) {
					content.replaceChildren();
					return;
				}

				helpPage.setPageIndex(pageIndex);
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
					showPage(currentPage.get());
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
		helpButton.innerText = '?';
		helpButton.setAttribute('aria-label', this.context.localization.help);

		helpButton.onclick = () => {
			this.showHelpOverlay();
		};

		buttonContainer.appendChild(helpButton);

		return buttonContainer;
	}
}
