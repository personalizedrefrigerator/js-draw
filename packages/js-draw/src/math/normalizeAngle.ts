
/**
 * Converts `angle` to an equivalent angle in the range `(-pi, pi]`.
 */
const normalizeAngle = (angle: number) => {
	angle = angle % (2 * Math.PI);

	if (angle < 0) {
		angle += 2 * Math.PI;
	}

	if (angle > Math.PI) {
		angle = angle - 2 * Math.PI;
	}

	return angle;
};

export default normalizeAngle;