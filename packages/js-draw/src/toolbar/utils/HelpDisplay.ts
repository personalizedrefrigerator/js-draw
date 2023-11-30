import { Rect2, Vec2 } from '@js-draw/math';
import { ToolbarContext } from '../types';
import makeDraggable from './makeDraggable';
import { MutableReactiveValue } from '../../util/ReactiveValue';

interface HelpRecord {
	targetElement: HTMLElement;
	helpText: string;
}

const cloneElementWithStyles = (element: HTMLElement) => {
	const restyle = (originalElement: HTMLElement, clonedElement: HTMLElement) => {
		const originalComputedStyle = getComputedStyle(originalElement);

		for (const propertyName of originalComputedStyle) {
			const propertyValue = originalComputedStyle.getPropertyValue(propertyName);
			clonedElement.style.setProperty(propertyName, propertyValue);
		}

		for (let i = 0; i < originalElement.children.length; i++) {
			const originalChild = originalElement.children.item(i) as HTMLElement;
			const clonedChild = clonedElement.children.item(i) as HTMLElement;

			if (originalChild && clonedChild) {
				restyle(originalChild, clonedChild);
			} else {
				console.warn('Missing child');
			}
		}
	};

	const elementClone = element.cloneNode(true) as HTMLElement;
	restyle(element, elementClone);
	return elementClone;
};

const createHelpPage = (item: HelpRecord) => {
	const container = document.createElement('div');
	container.classList.add('help-page-container');

	const textLabel = document.createElement('div');
	textLabel.classList.add('label');
	textLabel.innerText = item.helpText;

	const refreshContent = () => {
		const targetBBox = Rect2.of(item.targetElement.getBoundingClientRect());
		const clonedElementContainer = document.createElement('div');

		const clonedElement = cloneElementWithStyles(item.targetElement);
		clonedElement.style.margin = '0';

		clonedElementContainer.classList.add('cloned-element-container');
		clonedElementContainer.style.position = 'absolute';
		clonedElementContainer.style.left = `${targetBBox.topLeft.x}px`;
		clonedElementContainer.style.top = `${targetBBox.topLeft.y}px`;
		clonedElementContainer.style.backgroundColor = 'var(--background-color-1)';
		clonedElementContainer.style.borderRadius = '10px';

		clonedElementContainer.appendChild(clonedElement);
		container.replaceChildren(clonedElementContainer, textLabel);
	};

	return {
		addToParent: (parent: HTMLElement) => {
			refreshContent();
			parent.appendChild(container);
		},
		refresh: refreshContent,
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
			const helpPages = this.#helpData.map(item => createHelpPage(item));
			const currentPage = MutableReactiveValue.fromInitialValue(0);

			const content = document.createElement('div');

			const showPage = (pageIndex: number) => {
				if (pageIndex >= this.#helpData.length || pageIndex < 0) {
					content.replaceChildren();
					return;
				}

				content.replaceChildren();
				helpPages[pageIndex].addToParent(content);
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
					return currentPage.get() + 1 < helpPages.length;
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
		overlay.show();

		const setDragOffset = (offset: number) => {
			if (offset > 0 && !navigation.hasPrevious()) {
				offset = 0;
			}

			if (offset < 0 && !navigation.hasNext()) {
				offset = 0;
			}

			overlay.style.transform = `translate(${offset}px, 0px)`;
		};

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
					if (dragStatistics.displacement.x > 0) {
						navigation.toPrevious();
					} else {
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

		overlay.addEventListener('close', () => {
			dragListener.removeListeners();
			overlay.remove();
			resizeObserver?.disconnect();
		});
	}

	public registerTextHelpForElement(targetElement: HTMLElement, helpText: string) {
		this.#helpData.push({ targetElement, helpText });
	}

	public createToggleButton(): HTMLButtonElement {
		const helpButton = document.createElement('button');
		helpButton.classList.add('help-button');
		helpButton.innerText = '?';
		helpButton.setAttribute('aria-label', this.context.localization.help);

		helpButton.onclick = () => {
			this.showHelpOverlay();
		};

		return helpButton;
	}
}
