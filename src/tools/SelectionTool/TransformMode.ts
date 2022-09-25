import Editor from "../../Editor";
import Mat33 from "../../math/Mat33";
import { Point2 } from "../../math/Vec2";
import Vec3 from "../../math/Vec3";

export interface SelectionTransformer {
    onControlPointDragStart(startPoint: Point2): void;
    onControlPointDragUpdate(screenPos: Point2): void;
    onControlPointDragEnd(screenPos: Point2): void;
}

export class DragTransformer implements SelectionTransformer {
    public constructor(private editor: Editor, private selection: Selection) {}

    onControlPointDragStart(startPoint: Vec3) {
        this.selection.setTransform(Mat33.identity);
    }
    onControlPointDragUpdate(screenPos: Vec3): void {
        throw new Error("Method not implemented.");
    }
    onControlPointDragEnd(screenPos: Vec3): void {
        throw new Error("Method not implemented.");
    }
}

export class ResizeTransformer implements SelectionTransformer {
    public constructor(private selection: Selection) {}
}

export class RotateTransformer implements SelectionTransformer {
    public constructor(private selection: Selection) {}
}
