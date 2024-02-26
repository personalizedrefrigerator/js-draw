import { EditorEventType } from '../types';
import { KeyPressEvent, PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';
import Editor from '../Editor';
import { Point2, Vec2, LineSegment2, Color4, Rect2, Mat33 } from '@js-draw/math';
import Erase from '../commands/Erase';
import AbstractComponent from '../components/AbstractComponent';
import { PointerDevice } from '../Pointer';
import RenderingStyle from '../rendering/RenderingStyle';
import { decreaseSizeKeyboardShortcutId, increaseSizeKeyboardShortcutId } from './keybindings';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';
import Command from '../commands/Command';
import EditorImage from '../image/EditorImage';
import uniteCommands from '../commands/uniteCommands';

export enum EraserMode {
	PartialStroke = 'partial-stroke',
	FullStroke = 'full-stroke',
}

export default class Eraser extends BaseTool {
	private lastPoint: Point2|null = null;
	private isFirstEraseEvt: boolean = true;
	private thickness: number = 10;
	private thicknessValue: MutableReactiveValue<number>;
	private modeValue: MutableReactiveValue<EraserMode>;


	private toRemove: AbstractComponent[];
	private toAdd: AbstractComponent[];

	// Commands that each remove one element
	private eraseCommands: Erase[] = [];
	private addCommands: Command[] = [];

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);

		this.thicknessValue = ReactiveValue.fromInitialValue(this.thickness);
		this.thicknessValue.onUpdate(value => {
			this.thickness = value;

			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		});
		this.modeValue = ReactiveValue.fromInitialValue(EraserMode.PartialStroke);
		this.modeValue.onUpdate(_value => {
			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		});
	}

	private clearPreview() {
		this.editor.clearWetInk();
	}

	private getSizeOnCanvas() {
		return this.thickness / this.editor.viewport.getScaleFactor();
	}

	private drawPreviewAt(point: Point2) {
		this.clearPreview();

		const size = this.getSizeOnCanvas();

		const renderer = this.editor.display.getWetInkRenderer();
		const rect = this.getEraserRect(point);
		const fill: RenderingStyle = {
			fill: Color4.gray,
		};
		renderer.drawRect(rect, size / 4, fill);
	}

	/**
	 * @returns the eraser rectangle in canvas coordinates.
	 *
	 * For now, all erasers are rectangles or points.
	 */
	private getEraserRect(centerPoint: Point2) {
		const size = this.getSizeOnCanvas();
		const halfSize = Vec2.of(size / 2, size / 2);
		return Rect2.fromCorners(centerPoint.minus(halfSize), centerPoint.plus(halfSize));
	}

	/** Erases in a line from the last point to the current. */
	private eraseTo(currentPoint: Point2) {
		if (!this.isFirstEraseEvt && currentPoint.minus(this.lastPoint!).magnitude() === 0) {
			return;
		}
		this.isFirstEraseEvt = false;

		// Currently only objects within eraserRect or that intersect a straight line
		// from the center of the current rect to the previous are erased. TODO: Erase
		// all objects as if there were pointerMove events between the two points.
		const eraserRect = this.getEraserRect(currentPoint);
		const line = new LineSegment2(this.lastPoint!, currentPoint);
		const region = Rect2.union(line.bbox, eraserRect);

		const intersectingElems = this.editor.image.getElementsIntersectingRegion(region).filter(component => {
			return component.intersects(line) || component.intersectsRect(eraserRect);
		});

		// Only erase components that could be selected (and thus interacted with)
		// by the user.
		const eraseableElems = intersectingElems.filter(elem => elem.isSelectable());

		if (this.modeValue.get() === EraserMode.FullStroke) {
			// Remove any intersecting elements.
			this.toRemove.push(...eraseableElems);

			// Create new Erase commands for the now-to-be-erased elements and apply them.
			const newPartialCommands = eraseableElems.map(elem => new Erase([ elem ]));
			newPartialCommands.forEach(cmd => cmd.apply(this.editor));
			this.eraseCommands.push(...newPartialCommands);
		} else {
			const toErase: AbstractComponent[] = [];
			const toAdd: AbstractComponent[] = [];
			for (const targetElem of eraseableElems) {
				console.log('=');
				toErase.push(targetElem);
				if (!targetElem.dividedByLine || eraserRect.containsRect(targetElem.getExactBBox())) {
					console.log('ndv');
					continue;
				}

				const canvasThickness = this.getSizeOnCanvas();
				const direction = line.direction;
				const sourceLine = line.length > canvasThickness ? line : new LineSegment2(line.center.minus(direction.times(canvasThickness/2)), line.center.plus(direction.times(canvasThickness/2)));

				const translateVec = line.direction.orthog().scale(canvasThickness / 2);
				const translateMat1 = Mat33.translation(translateVec);
				const line1 = sourceLine.transformedBy(translateMat1);

				const split1 = targetElem.dividedByLine(line1);

				if (split1.length === 1) {
					toAdd.push(split1[0]);
				} else {
					let [part0, part1] = split1;

					const translateMat2 = Mat33.translation(translateVec.scale(-1));
					const l = sourceLine.transformedBy(translateMat2);
					const line2 = l.transformedBy(Mat33.scaling2D(2, l.center));

					const renderer = this.editor.display.getWetInkRenderer();
					renderer.drawPoints(line1.p1, line1.p2, line2.p1, line2.p2);

					if (!part1.intersects(line2)) {
						const temp = part0;
						part0 = part1;
						part1 = temp;
					}
					toAdd.push(part0);

					const split2 = part1.dividedByLine!(line2);
					if (split2.length === 1) {
						toAdd.push(split2[0]);
					} else {
						if (split2[1].intersects(line)) {
							toAdd.push(split2[0]);
						} else
							toAdd.push(split2[1]);
					}
				}
			}

			const eraseCommand = new Erase(toErase);
			const newAddCommands = toAdd.map(elem => EditorImage.addElement(elem));

			eraseCommand.apply(this.editor);
			newAddCommands.forEach(command => command.apply(this.editor));

			const finalToErase = [];
			for (const item of toErase) {
				if (this.toAdd.includes(item)) {
					this.toAdd = this.toAdd.filter(i => i !== item);
				} else {
					finalToErase.push(item);
				}
			}

			this.toRemove.push(...finalToErase);
			this.toAdd.push(...toAdd);
			this.eraseCommands.push(new Erase(finalToErase));
			this.addCommands.push(...newAddCommands);
		}

		//this.drawPreviewAt(currentPoint);
		this.lastPoint = currentPoint;
	}

	public override onPointerDown(event: PointerEvt): boolean {
		if (event.allPointers.length === 1 || event.current.device === PointerDevice.Eraser) {
			this.lastPoint = event.current.canvasPos;
			this.toRemove = [];
			this.toAdd = [];
			this.isFirstEraseEvt = true;

			this.drawPreviewAt(event.current.canvasPos);
			return true;
		}

		return false;
	}

	public override onPointerMove(event: PointerEvt): void {
		const currentPoint = event.current.canvasPos;

		this.eraseTo(currentPoint);
	}

	public override onPointerUp(event: PointerEvt): void {
		this.eraseTo(event.current.canvasPos);

		const commands: Command[] = [];

		if (this.addCommands.length > 0) {
			this.addCommands.forEach(cmd => cmd.unapply(this.editor));

			commands.push(...this.toAdd.map(a => EditorImage.addElement(a)));

			this.addCommands = [];
		}

		if (this.eraseCommands.length > 0) {
			// Undo commands for each individual component and unite into a single command.
			this.eraseCommands.forEach(cmd => cmd.unapply(this.editor));
			this.eraseCommands = [];

			const command = new Erase(this.toRemove);
			commands.push(command);
		}

		if (commands.length === 1) {
			this.editor.dispatch(commands[0]); // dispatch: Makes undo-able.
		} else {
			this.editor.dispatch(uniteCommands(commands));
		}

		this.clearPreview();
	}

	public override onGestureCancel(): void {
		this.eraseCommands.forEach(cmd => cmd.unapply(this.editor));
		this.eraseCommands = [];
		this.clearPreview();
	}


	public override onKeyPress(event: KeyPressEvent): boolean {
		const shortcuts = this.editor.shortcuts;

		let newThickness: number|undefined;
		if (shortcuts.matchesShortcut(decreaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 2/3;
		} else if (shortcuts.matchesShortcut(increaseSizeKeyboardShortcutId, event)) {
			newThickness = this.getThickness() * 3/2;
		}

		if (newThickness !== undefined) {
			newThickness = Math.min(Math.max(1, newThickness), 200);
			this.setThickness(newThickness);
			return true;
		}

		return false;
	}

	/** Returns the side-length of the tip of this eraser. */
	public getThickness() {
		return this.thickness;
	}

	/** Sets the side-length of this' tip. */
	public setThickness(thickness: number) {
		this.thicknessValue.set(thickness);
	}

	/**
	 * Returns a {@link MutableReactiveValue} that can be used to watch
	 * this tool's thickness.
	 */
	public getThicknessValue() {
		return this.thicknessValue;
	}
}
