import solveQuadratic from './solveQuadratic';

describe('solveQuadratic', () => {
	it('should solve linear equations', () => {
		expect(solveQuadratic(0, 1, 2)).toMatchObject([-2, -2]);
		expect(solveQuadratic(0, 0, 2)[0]).toBeNaN();
	});

	it('should return both solutions to quadratic equations', () => {
		type TestCase = [[number, number, number], [number, number]];

		const testCases: TestCase[] = [
			[
				[1, 0, 0],
				[0, 0],
			],
			[
				[2, 0, 0],
				[0, 0],
			],

			[
				[1, 0, -1],
				[1, -1],
			],
			[
				[1, 0, -4],
				[2, -2],
			],
			[
				[1, 0, 4],
				[NaN, NaN],
			],

			[
				[1, 1, 0],
				[0, -1],
			],
			[
				[1, 2, 0],
				[0, -2],
			],

			[
				[1, 2, 1],
				[-1, -1],
			],
			[
				[-9, 2, 1 / 3],
				[1 / 3, -1 / 9],
			],
		];

		for (const [testCase, solution] of testCases) {
			const foundSolutions = solveQuadratic(...testCase);
			for (let i = 0; i < 2; i++) {
				if (isNaN(solution[i]) && isNaN(foundSolutions[i])) {
					expect(foundSolutions[i]).toBeNaN();
				} else {
					expect(foundSolutions[i]).toBeCloseTo(solution[i]);
				}
			}
		}
	});
});
