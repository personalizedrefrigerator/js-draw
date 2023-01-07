import { PointerEvt } from '../types';
import BaseTool from './BaseTool';
import Editor from '../Editor';
import { Point2 } from '../math/Vec2';
import LineSegment2 from '../math/LineSegment2';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import { PointerDevice } from '../Pointer';

export default class Eraser extends BaseTool {
	private lastPoint: Point2;
	private toRemove: AbstractComponent[];

	// Commands that each remove one element
	private partialCommands: Erase[] = [];

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);
	}

	public onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 || event.current.device === PointerDevice.Eraser) {
			this.lastPoint = event.current.canvasPos;
			this.toRemove = [];
			return true;
		}

		return false;
	}

	public onPointerMove(event: PointerEvt): void {
		const currentPoint = event.current.canvasPos;
		if (currentPoint.minus(this.lastPoint).magnitude() === 0) {
			return;
		}

		const line = new LineSegment2(this.lastPoint, currentPoint);
		const region = line.bbox;

		const intersectingElems = this.editor.image.getElementsIntersectingRegion(region).filter(component => {
			return component.intersects(line);
		});

		// Remove any intersecting elements.
		this.toRemove.push(...intersectingElems);

		// Create new Erase commands for the now-to-be-erased elements and apply them.
		const newPartialCommands = intersectingElems.map(elem => new Erase([ elem ]));
		newPartialCommands.forEach(cmd => cmd.apply(this.editor));

		this.partialCommands.push(...newPartialCommands);

		this.lastPoint = currentPoint;
	}

	public onPointerUp(_event: PointerEvt): void {
		if (this.toRemove.length > 0) {
			// Undo commands for each individual component and unite into a single command.
			this.partialCommands.forEach(cmd => cmd.unapply(this.editor));

			const command = new Erase(this.toRemove);
			this.editor.dispatch(command); // dispatch: Makes undo-able.
		}
	}

	public onGestureCancel(): void {
		this.partialCommands.forEach(cmd => cmd.unapply(this.editor));
	}
}
