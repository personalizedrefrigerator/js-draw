// Types related to the image editor

import EventDispatcher from './EventDispatcher';
import Mat33 from './math/Mat33';
import { Point2, Vec2 } from './math/Vec2';
import BaseTool from './tools/BaseTool';
import AbstractComponent from './components/AbstractComponent';
import Rect2 from './math/shapes/Rect2';
import Color4 from './Color4';
import Command from './commands/Command';
import BaseWidget from './toolbar/widgets/BaseWidget';

export type EditorNotifier = EventDispatcher<EditorEventType, EditorEventDataType>;

export enum EditorEventType {
	ToolEnabled,
	ToolDisabled,
	ToolUpdated,

	UndoRedoStackUpdated,
	CommandDone,
	CommandUndone,
	ObjectAdded,

	ViewportChanged,
	DisplayResized,

	ColorPickerToggled,
	ColorPickerColorSelected,
	ToolbarDropdownShown,
}

// Types of `EditorUndoStackUpdated` events.
export enum UndoEventType {
	CommandDone,
	CommandUndone,
	CommandRedone,
}

type EditorToolEventType = EditorEventType.ToolEnabled
	| EditorEventType.ToolDisabled
	| EditorEventType.ToolUpdated;

export interface EditorToolEvent {
	readonly kind: EditorToolEventType;
	readonly tool: BaseTool;
}

export interface EditorObjectEvent {
	readonly kind: EditorEventType.ObjectAdded;
	readonly object: AbstractComponent;
}

export interface EditorViewportChangedEvent {
	readonly kind: EditorEventType.ViewportChanged;

	// Canvas -> screen transform
	readonly newTransform: Mat33;
	readonly oldTransform: Mat33;
}

export interface DisplayResizedEvent {
	readonly kind: EditorEventType.DisplayResized;
	readonly newSize: Vec2;
}

export interface EditorUndoStackUpdated {
	readonly kind: EditorEventType.UndoRedoStackUpdated;

	readonly undoStackSize: number;
	readonly redoStackSize: number;

	readonly command?: Command;
	readonly stackUpdateType: UndoEventType;
}

export interface CommandDoneEvent {
	readonly kind: EditorEventType.CommandDone;
	readonly command: Command;
}

export interface CommandUndoneEvent {
	readonly kind: EditorEventType.CommandUndone;
	readonly command: Command;
}

export interface ColorPickerToggled {
	readonly kind: EditorEventType.ColorPickerToggled;
	readonly open: boolean;
}

export interface ColorPickerColorSelected {
	readonly kind: EditorEventType.ColorPickerColorSelected;
	readonly color: Color4;
}

export interface ToolbarDropdownShownEvent {
	readonly kind: EditorEventType.ToolbarDropdownShown;
	readonly parentWidget: BaseWidget;
}

export type EditorEventDataType = EditorToolEvent | EditorObjectEvent
	| EditorViewportChangedEvent | DisplayResizedEvent
	| EditorUndoStackUpdated | CommandDoneEvent | CommandUndoneEvent
	| ColorPickerToggled | ColorPickerColorSelected
	| ToolbarDropdownShownEvent;


// Returns a Promise to indicate that the event source should pause until the Promise resolves.
// Returns null to continue loading without pause.
// [totalToProcess] can be an estimate and may change if a better estimate becomes available.
export type OnProgressListener =
	(amountProcessed: number, totalToProcess: number)=> Promise<void>|null|void;

export type ComponentAddedListener = (component: AbstractComponent)=> Promise<void>|void;

// Called when a new estimate for the import/export rect has been generated. This can be called multiple times.
// Only the last call to this listener must be accurate.
// The import/export rect is also returned by [start].
export type OnDetermineExportRectListener = (exportRect: Rect2)=> void;

export interface ImageLoader {
	start(
		onAddComponent: ComponentAddedListener,
		onProgressListener: OnProgressListener,
		onDetermineExportRect?: OnDetermineExportRectListener,
	): Promise<void>;
}

export interface StrokeDataPoint {
	pos: Point2;
	width: number;

	/** Time in milliseconds (e.g. as returned by `new Date().getTime()`). */
	time: number;
	color: Color4;
}
