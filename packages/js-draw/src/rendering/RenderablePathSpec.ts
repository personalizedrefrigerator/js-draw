
import { Mat33, Path, PathCommand, PathCommandType, Point2, Rect2 } from '@js-draw/math';
import RenderingStyle from './RenderingStyle';

interface RenderablePathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	style: RenderingStyle;
	path?: Path;
}

/** Converts a renderable path (a path with a `startPoint`, `commands`, and `style`). */
export const pathFromRenderable = (renderable: RenderablePathSpec): Path => {
	if (renderable.path) {
		return renderable.path;
	}

	return new Path(renderable.startPoint, renderable.commands);
};

export const pathToRenderable = (path: Path, style: RenderingStyle): RenderablePathSpec => {
	return {
		startPoint: path.startPoint,
		style,
		commands: path.parts,
		path,
	};
};


/**
 * @returns a Path that, when rendered, looks roughly equivalent to the given path.
 */
export const visualEquivalent = (renderablePath: RenderablePathSpec, visibleRect: Rect2): RenderablePathSpec => {
	const path = pathFromRenderable(renderablePath);
	const strokeWidth = renderablePath.style.stroke?.width ?? 0;
	const onlyStroked = strokeWidth > 0 && renderablePath.style.fill.a === 0;
	const styledPathBBox = path.bbox.grownBy(strokeWidth);

	// Are we close enough to the path that it fills the entire screen?
	if (
		onlyStroked
		&& renderablePath.style.stroke
		&& strokeWidth > visibleRect.maxDimension
		&& styledPathBBox.containsRect(visibleRect)
	) {
		const strokeRadius = strokeWidth / 2;

		// Do a fast, but with many false negatives, check.
		for (const point of path.startEndPoints()) {
			// If within the strokeRadius of any point
			if (visibleRect.isWithinRadiusOf(strokeRadius, point)) {
				return pathToRenderable(
					Path.fromRect(visibleRect),
					{ fill: renderablePath.style.stroke.color },
				);
			}
		}
	}

	// Scale the expanded rect --- the visual equivalent is only close for huge strokes.
	const expandedRect = visibleRect.grownBy(strokeWidth)
		.transformedBoundingBox(Mat33.scaling2D(4, visibleRect.center));

	// TODO: Handle simplifying very small paths.
	if (expandedRect.containsRect(styledPathBBox)) {
		return renderablePath;
	}

	const parts: PathCommand[] = [];
	let startPoint = path.startPoint;

	for (const part of path.parts) {
		const partBBox = Path.computeBBoxForSegment(startPoint, part).grownBy(strokeWidth);
		let endPoint;

		if (part.kind === PathCommandType.LineTo || part.kind === PathCommandType.MoveTo) {
			endPoint = part.point;
		} else {
			endPoint = part.endPoint;
		}

		const intersectsVisible = partBBox.intersects(visibleRect);

		if (intersectsVisible) {
			// TODO: Can we trim parts of paths that intersect the visible rectangle?
			parts.push(part);
		} else if (onlyStroked || part.kind === PathCommandType.MoveTo) {
			// We're stroking (not filling) and the path doesn't intersect the bounding box.
			// Don't draw it, but preserve the endpoints.
			parts.push({
				kind: PathCommandType.MoveTo,
				point: endPoint,
			});
		}
		else {
			// Otherwise, we may be filling. Try to roughly preserve the filled region.
			parts.push({
				kind: PathCommandType.LineTo,
				point: endPoint,
			});
		}

		startPoint = endPoint;
	}

	return pathToRenderable(new Path(path.startPoint, parts), renderablePath.style);
};

export default RenderablePathSpec;
