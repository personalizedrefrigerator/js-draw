
const stopPropagationOfScrollingWheelEvents = (scrollingContainer: HTMLElement) => {
	const scrollsAxis = (delta: number, clientSize: number, scrollOffset: number, scrollSize: number) => {
		const hasScroll = clientSize !== scrollSize && delta !== 0;

		const eventScrollsPastStart = scrollSize + delta <= 0;
		const scrollEnd = scrollOffset + clientSize;
		const eventScrollsPastEnd = scrollEnd + delta > scrollSize;

		return hasScroll && !eventScrollsPastStart && !eventScrollsPastEnd;
	};

	scrollingContainer.onwheel = (event) => {
		const scrollsX = scrollsAxis(event.deltaX, scrollingContainer.clientWidth, scrollingContainer.scrollLeft, scrollingContainer.scrollWidth);
		const scrollsY = scrollsAxis(event.deltaY, scrollingContainer.clientHeight, scrollingContainer.scrollTop, scrollingContainer.scrollHeight);

		// Stop the editor from receiving the event if it will scroll the pen type selector
		// instead.
		if (scrollsX || scrollsY) {
			event.stopPropagation();
		}
	};
};

export default stopPropagationOfScrollingWheelEvents;