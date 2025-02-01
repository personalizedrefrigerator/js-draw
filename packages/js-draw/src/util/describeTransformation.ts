import { Mat33, Vec2 } from '@js-draw/math';

interface Descriptions {
	zoomedIn: string;
	zoomedOut: string;
	movedLeft: string;
	movedRight: string;
	movedUp: string;
	movedDown: string;
	rotatedBy: (deg: number) => string;
}

const describeTransformation = (
	// The location of the object before being transformed
	origin: Vec2,
	// The transformation
	transform: Mat33,
	// If true, moving the object right, for example, reads as "moved left"
	invertDirections: boolean,
	localizationTable: Descriptions,
) => {
	// Describe the transformation's affect on the viewport (note that transformation transforms
	// the **elements** within the viewport). Assumes the transformation only does rotation/scale/translation.
	const linearTransformedVec = transform.transformVec3(Vec2.unitX);
	const affineTransformedVec = transform.transformVec2(origin);

	const scale = linearTransformedVec.magnitude();
	const clockwiseRotation = -(180 / Math.PI) * linearTransformedVec.angle();
	const translation = affineTransformedVec.minus(origin);

	const result = [];
	if (scale > 1.2) {
		result.push(localizationTable.zoomedIn);
	} else if (scale < 0.8) {
		result.push(localizationTable.zoomedOut);
	}

	if (Math.floor(Math.abs(clockwiseRotation)) > 0) {
		const roundedRotation = Math.round(invertDirections ? -clockwiseRotation : clockwiseRotation);
		result.push(localizationTable.rotatedBy(roundedRotation));
	}

	const minTranslation = 1e-4;
	if (translation.x > minTranslation) {
		result.push(invertDirections ? localizationTable.movedLeft : localizationTable.movedRight);
	} else if (translation.x < -minTranslation) {
		result.push(invertDirections ? localizationTable.movedRight : localizationTable.movedLeft);
	}

	if (translation.y < -minTranslation) {
		result.push(invertDirections ? localizationTable.movedDown : localizationTable.movedUp);
	} else if (translation.y > minTranslation) {
		result.push(invertDirections ? localizationTable.movedUp : localizationTable.movedDown);
	}

	return result.join('; ');
};

export default describeTransformation;
