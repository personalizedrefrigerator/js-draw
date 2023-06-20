import Rect2 from '../math/shapes/Rect2';

export interface CommandLocalization {
	movedLeft: string;
	movedUp: string;
	movedDown: string;
	movedRight: string;
	rotatedBy: (degrees: number) => string;
	zoomedOut: string;
	zoomedIn: string;
	erasedNoElements: string;
	duplicatedNoElements: string;
	elements: string;
	updatedViewport: string;
	transformedElements: (elemCount: number) => string;
	resizeOutputCommand: (newSize: Rect2) => string;
	addElementAction: (elemDescription: string) => string;
	eraseAction: (elemDescription: string, numElems: number) => string;
	duplicateAction: (elemDescription: string, count: number)=> string;
	inverseOf: (actionDescription: string)=> string;
	unionOf: (actionDescription: string, actionCount: number)=> string;

	selectedElements: (count: number)=>string;
}

export const defaultCommandLocalization: CommandLocalization = {
	updatedViewport: 'Transformed Viewport',
	transformedElements: (elemCount) => `Transformed ${elemCount} element${elemCount === 1 ? '' : 's'}`,
	resizeOutputCommand: (newSize: Rect2) => `Resized image to ${newSize.w}x${newSize.h}`,
	addElementAction: (componentDescription: string) => `Added ${componentDescription}`,
	eraseAction: (componentDescription: string, numElems: number) => `Erased ${numElems} ${componentDescription}`,
	duplicateAction: (componentDescription: string, numElems: number) => `Duplicated ${numElems} ${componentDescription}`,
	unionOf: (actionDescription: string, actionCount: number) => `Union: ${actionCount} ${actionDescription}`,
	inverseOf: (actionDescription: string) => `Inverse of ${actionDescription}`,
	elements: 'Elements',
	erasedNoElements: 'Erased nothing',
	duplicatedNoElements: 'Duplicated nothing',

	rotatedBy: (degrees) => `Rotated by ${Math.abs(degrees)} degrees ${degrees < 0 ? 'clockwise' : 'counter-clockwise'}`,
	movedLeft: 'Moved left',
	movedUp: 'Moved up',
	movedDown: 'Moved down',
	movedRight: 'Moved right',
	zoomedOut: 'Zoomed out',
	zoomedIn: 'Zoomed in',
	selectedElements: (count) => `Selected ${count} element${count === 1 ? '' : 's'}`,
};
