
const stopPropagationOfScrollingWheelEvents = (scrollingContainer: HTMLElement) => {
	scrollingContainer.onwheel = (event) => {
		const hasScroll = scrollingContainer.clientWidth !== scrollingContainer.scrollWidth
						&& event.deltaX !== 0;
		const eventScrollsPastLeft =
			scrollingContainer.scrollLeft + event.deltaX <= 0;
		const scrollRight = scrollingContainer.scrollLeft + scrollingContainer.clientWidth;
		const eventScrollsPastRight =
			scrollRight + event.deltaX > scrollingContainer.scrollWidth;

		// Stop the editor from receiving the event if it will scroll the pen type selector
		// instead.
		if (hasScroll && !eventScrollsPastLeft && !eventScrollsPastRight) {
			event.stopPropagation();
		}
	};
};

export default stopPropagationOfScrollingWheelEvents;