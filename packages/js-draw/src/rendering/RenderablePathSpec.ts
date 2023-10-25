
import { Color4, Mat33, Path, PathCommand, PathCommandType, Point2, Rect2 } from '@js-draw/math';
import RenderingStyle from './RenderingStyle';

interface RenderablePathSpec {
	startPoint: Point2;
	commands: PathCommand[];
	style: RenderingStyle;
	path?: Path;
}

interface RenderablePathSpecWithPath extends RenderablePathSpec {
	path: Path;
}

/** Converts a renderable path (a path with a `startPoint`, `commands`, and `style`). */
export const pathFromRenderable = (renderable: RenderablePathSpec): Path => {
	if (renderable.path) {
		return renderable.path;
	}

	return new Path(renderable.startPoint, renderable.commands);
};

export const pathToRenderable = (path: Path, style: RenderingStyle): RenderablePathSpecWithPath => {
	return {
		startPoint: path.startPoint,
		style,
		commands: path.parts,
		path,
	};
};

/**
 * Fills the optional `path` field in `RenderablePathSpec`
 * with `path` if not already filled
 */
const pathIncluded = (renderablePath: RenderablePathSpec, path: Path): RenderablePathSpecWithPath => {
	if (renderablePath.path) {
		return renderablePath as RenderablePathSpecWithPath;
	}

	return {
		...renderablePath,
		path,
	};
};

interface RectangleSimplificationResult {
	rectangle: Rect2;
	path: RenderablePathSpecWithPath;
	fullScreen: boolean;
}

/**
 * Tries to simplify the given path to a fullscreen rectangle.
 * Returns `null` on failure.
 *
 * @internal
 */
export const simplifyPathToFullScreenOrEmpty = (
	renderablePath: RenderablePathSpec,
	visibleRect: Rect2,
	options: { fastCheck: boolean, expensiveCheck: boolean } = { fastCheck: true, expensiveCheck: true}
): RectangleSimplificationResult|null => {
	const path = pathFromRenderable(renderablePath);
	const strokeWidth = renderablePath.style.stroke?.width ?? 0;
	const onlyStroked = strokeWidth > 0 && renderablePath.style.fill.a === 0;
	const styledPathBBox = path.bbox.grownBy(strokeWidth);

	// Are we close enough to the path that it fills the entire screen?
	const isOnlyStrokedAndCouldFillScreen = (
		onlyStroked
		&& strokeWidth > visibleRect.maxDimension
		&& styledPathBBox.containsRect(visibleRect)
	);
	if (options.fastCheck && isOnlyStrokedAndCouldFillScreen && renderablePath.style.stroke) {
		const strokeRadius = strokeWidth / 2;

		// Are we completely within the stroke?
		// Do a fast, but with many false negatives, check.
		for (const point of path.startEndPoints()) {
			// If within the strokeRadius of any point
			if (visibleRect.isWithinRadiusOf(strokeRadius, point)) {
				return {
					rectangle: visibleRect,
					path: pathToRenderable(
						Path.fromRect(visibleRect),
						{ fill: renderablePath.style.stroke.color },
					),
					fullScreen: true,
				};
			}
		}
	}

	// Try filtering again, but with slightly more expensive checks
	if (
		options.expensiveCheck &&
		isOnlyStrokedAndCouldFillScreen && renderablePath.style.stroke
		&& strokeWidth > visibleRect.maxDimension * 3
	) {
		const signedDist = path.signedDistance(visibleRect.center, strokeWidth / 2);
		const margin = strokeWidth / 6;

		if (signedDist < -visibleRect.maxDimension / 2 - margin) {
			return {
				path: pathToRenderable(
					Path.fromRect(visibleRect),
					{ fill: renderablePath.style.stroke.color },
				),
				rectangle: visibleRect,
				fullScreen: true,
			};
		} else if (signedDist > visibleRect.maxDimension / 2 + margin) {
			return {
				path: pathToRenderable(
					Path.empty,
					{ fill: Color4.transparent },
				),
				rectangle: Rect2.empty,
				fullScreen: false,
			};
		}
	}

	return null;
};

/**
 * @returns a Path that, when rendered, looks roughly equivalent to the given path.
 */
export const visualEquivalent = (renderablePath: RenderablePathSpec, visibleRect: Rect2): RenderablePathSpecWithPath => {
	const path = pathFromRenderable(renderablePath);
	const strokeWidth = renderablePath.style.stroke?.width ?? 0;
	const onlyStroked = strokeWidth > 0 && renderablePath.style.fill.a === 0;
	const styledPathBBox = path.bbox.grownBy(strokeWidth);

	let rectangleSimplification = simplifyPathToFullScreenOrEmpty(
		renderablePath, visibleRect, { fastCheck: true, expensiveCheck: false, }
	);
	if (rectangleSimplification) {
		return rectangleSimplification.path;
	}

	// Scale the expanded rect --- the visual equivalent is only close for huge strokes.
	const expandedRect = visibleRect.grownBy(strokeWidth)
		.transformedBoundingBox(Mat33.scaling2D(4, visibleRect.center));

	// TODO: Handle simplifying very small paths.
	if (expandedRect.containsRect(styledPathBBox)) {
		return pathIncluded(renderablePath, path);
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

	const newPath = new Path(path.startPoint, parts);
	const newStyle = renderablePath.style;

	rectangleSimplification = simplifyPathToFullScreenOrEmpty(renderablePath, visibleRect, { fastCheck: false, expensiveCheck: true, });
	if (rectangleSimplification) {
		return rectangleSimplification.path;
	}

	return pathToRenderable(newPath, newStyle);
};


export default RenderablePathSpec;
