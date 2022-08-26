import Rect2 from '../geometry/Rect2';

export interface CommandLocalization {
	movedLeft: string;
	movedUp: string;
	movedDown: string;
	movedRight: string;
	rotatedBy: (degrees: number) => string;
	zoomedOut: string;
	zoomedIn: string;
	erasedNoElements: string;
	elements: string;
	updatedViewport: string;
	transformedElements: (elemCount: number) => string;
	resizeOutputCommand: (newSize: Rect2) => string;
	addElementAction: (elemDescription: string) => string;
	eraseAction: (elemDescription: string, numElems: number) => string;
}

export const defaultCommandLocalization: CommandLocalization = {
	updatedViewport: 'Transformed Viewport',
	transformedElements: (elemCount) => `Transformed ${elemCount} elements`,
	resizeOutputCommand: (newSize: Rect2) => `Resized image to ${newSize.w}x${newSize.h}`,
	addElementAction: (componentDescription: string) => `Added ${componentDescription}`,
	eraseAction: (componentDescription: string, numElems: number) => `Erased ${numElems} ${componentDescription}`,
	elements: 'Elements',
	erasedNoElements: 'Erased nothing',
	rotatedBy: (degrees) => `Rotated by ${Math.abs(degrees)} degrees ${degrees < 0 ? 'clockwise' : 'counter-clockwise'}`,
	movedLeft: 'Moved left',
	movedUp: 'Moved up',
	movedDown: 'Moved down',
	movedRight: 'Moved right',
	zoomedOut: 'Zoomed out',
	zoomedIn: 'Zoomed in',
};
