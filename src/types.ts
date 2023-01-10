// Types related to the image editor

import EventDispatcher from './EventDispatcher';
import Mat33 from './math/Mat33';
import { Point2, Vec2 } from './math/Vec2';
import Vec3 from './math/Vec3';
import BaseTool from './tools/BaseTool';
import AbstractComponent from './components/AbstractComponent';
import Rect2 from './math/Rect2';
import Pointer from './Pointer';
import Color4 from './Color4';
import Command from './commands/Command';
import BaseWidget from './toolbar/widgets/BaseWidget';


export interface PointerEvtListener {
	onPointerDown(event: PointerEvt): boolean;
	onPointerMove(event: PointerEvt): void;
	onPointerUp(event: PointerEvt): void;

	// Called if a pointer that has been captured by this listener (by returning
	// `true` from `onPointerDown`) is re-captured by another listener.
	//
	// When called, this method should cancel any changes being made by the current
	// gesture.
	onGestureCancel(): void;
}


export enum InputEvtType {
	PointerDownEvt,
	PointerMoveEvt,
	PointerUpEvt,
	GestureCancelEvt,

	WheelEvt,
	KeyPressEvent,
	KeyUpEvent,

	CopyEvent,
	PasteEvent,
}

// [delta.x] is horizontal scroll,
// [delta.y] is vertical scroll,
// [delta.z] is zoom scroll (ctrl+scroll or pinch zoom)
export interface WheelEvt {
	readonly kind: InputEvtType.WheelEvt;
	readonly delta: Vec3;
	readonly screenPos: Point2;
}

export interface KeyPressEvent {
	readonly kind: InputEvtType.KeyPressEvent;

	// key, as given by an HTML `KeyboardEvent`
	readonly key: string;

	// If `ctrlKey` is undefined, that is equivalent to `ctrlKey = false`.
	readonly ctrlKey: boolean|undefined;

	// If falsey, the `alt` key is not pressed.
	readonly altKey: boolean|undefined;
}

export interface KeyUpEvent {
	readonly kind: InputEvtType.KeyUpEvent;
	readonly key: string;

	// As in `KeyPressEvent, if `ctrlKey` is undefined, that is equivalent to
	// `ctrlKey = false`.
	readonly ctrlKey: boolean|undefined;
	readonly altKey: boolean|undefined;
}

export interface CopyEvent {
	readonly kind: InputEvtType.CopyEvent;
	setData(mime: string, data: string): void;
}

export interface PasteEvent {
	readonly kind: InputEvtType.PasteEvent;
	readonly data: string;
	readonly mime: string;
}

// Event triggered when pointer capture is taken by a different [PointerEvtListener].
export interface GestureCancelEvt {
	readonly kind: InputEvtType.GestureCancelEvt;
}

interface PointerEvtBase {
	readonly current: Pointer;
	readonly allPointers: Pointer[];
}

export interface PointerDownEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerDownEvt;
}

export interface PointerMoveEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerMoveEvt;
}

export interface PointerUpEvt extends PointerEvtBase {
	readonly kind: InputEvtType.PointerUpEvt;
}

export type PointerEvt = PointerDownEvt | PointerMoveEvt | PointerUpEvt;
export type InputEvt = KeyPressEvent | KeyUpEvent | WheelEvt | GestureCancelEvt | PointerEvt | CopyEvent | PasteEvent;

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
	time: number;
	color: Color4;
}
