import stopPropagationOfScrollingWheelEvents from '../../../util/stopPropagationOfScrollingWheelEvents';
import { MutableReactiveValue, ReactiveValue } from '../../../util/ReactiveValue';

export interface SnappedListItem<DataType> {
	element: HTMLElement;
	data: DataType;
}

type SnappedListItems<DataType> = Array<SnappedListItem<DataType>>;

export interface SnappedListControl<DataType> {
	container: HTMLElement;
	visibleItem: ReactiveValue<DataType|null>;
}

/**
 * Creates a list that snaps to each item and reports the selected item.
 */
const makeSnappedList = <DataType> (
	itemsValue: ReactiveValue<SnappedListItems<DataType>>,
): SnappedListControl<DataType> => {
	const container = document.createElement('div');
	container.classList.add('toolbar-snapped-scroll-list');

	const visibleIndex = MutableReactiveValue.fromInitialValue(0);
	let observer: IntersectionObserver|null = null;

	const createObserver = () => {
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
					const indexString = entry.target.getAttribute('data-item-index');
					if (indexString === null) throw new Error('Could not find attribute data-item-index');
					const index = Number(indexString);

					visibleIndex.set(index);
					break;
				}
			}
		}, {
			// Element to use as the boudning box with which to intersect.
			// See https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
			root: container,

			// Fraction of an element that must be visible to trigger the callback:
			threshold: 0.9,
		});
	};
	const destroyObserver = () => {
		if (observer) {
			observer.disconnect();
			visibleIndex.set(0);
			observer = null;
		}
	};

	const wrappedItems = ReactiveValue.map(itemsValue, items => {
		return items.map((item, index) => {
			const wrapper = document.createElement('div');

			if (item.element.parentElement) item.element.remove();
			wrapper.appendChild(item.element);

			wrapper.classList.add('item');
			wrapper.setAttribute('data-item-index', `${index}`);

			return {
				element: wrapper,
				data: item.data,
			};
		});
	});

	const lastItems: SnappedListItems<DataType> = [];
	wrappedItems.onUpdateAndNow(items => {
		visibleIndex.set(-1);

		for (const item of lastItems) {
			observer?.unobserve(item.element);
		}
		container.replaceChildren();

		// An observer is only necessary if there are multiple items to scroll through.
		if (items.length > 1) {
			createObserver();
		} else {
			destroyObserver();
		}

		// Different styling is applied when empty
		if (items.length === 0) {
			container.classList.add('-empty');
		} else {
			container.classList.remove('-empty');
		}

		for (const item of items) {
			container.appendChild(item.element);
		}

		visibleIndex.set(0);

		if (observer) {
			for (const item of items) {
				observer.observe(item.element);
			}
		}
	});

	const visibleItem = ReactiveValue.map(visibleIndex, index => {
		const values = itemsValue.get();
		if (0 <= index && index < values.length) {
			return values[index].data;
		}
		return null;
	});

	// makeSnappedList is generally shown within the toolbar. This allows users to
	// scroll it with a touchpad.
	stopPropagationOfScrollingWheelEvents(container);

	return {
		container,
		visibleItem,
	};
};

export default makeSnappedList;
