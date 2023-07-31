import { reactiveValueFromPropertyMutable, reactiveValueFromImmutable, mapReactiveValueMutable, mapReactiveValue } from '../../../util/ReactiveValue';
import { EnumInputChoice, NumberInputType, ToolButtonSpec, ToolbarWidgetSpec, ToolbarWidgetType } from '../types';
import { PenTool } from '../../../tools/lib';
import makeToolButtonSpecification from './makeToolButtonSpecification';
import { ToolbarContext } from './defaultSpecification';
import { ComponentBuilderFactory } from '../../../components/builders/types';
import { BaseToolbarLocalization } from '../localization';
import { makeArrowBuilder } from '../../../components/builders/ArrowBuilder';
import { makeFreehandLineBuilder } from '../../../components/builders/FreehandLineBuilder';
import { makePressureSensitiveFreehandLineBuilder } from '../../../components/builders/PressureSensitiveFreehandLineBuilder';
import { makeLineBuilder } from '../../../components/builders/LineBuilder';
import { makeFilledRectangleBuilder, makeOutlinedRectangleBuilder } from '../../../components/builders/RectangleBuilder';
import { makeOutlinedCircleBuilder } from '../../../components/builders/CircleBuilder';
import { IconSpec, IconType } from '../icon';


export interface PenTypeRecord {
	// Description of the factory (e.g. 'Freehand line')
	name: string;

	// A unique ID for the facotory (e.g. 'chisel-tip-pen')
	id: string;

	// Creates an `AbstractComponent` from pen input.
	factory: ComponentBuilderFactory;
}

const getDefaultPenFactories = (localization: BaseToolbarLocalization): PenTypeRecord[] => {
	return [
		{
			name: localization.flatTipPen,
			id: 'pressure-sensitive-pen',

			factory: makePressureSensitiveFreehandLineBuilder,
		},
		{
			name: localization.roundedTipPen,
			id: 'freehand-pen',

			factory: makeFreehandLineBuilder,
		},
		{
			name: localization.arrowPen,
			id: 'arrow',

			factory: makeArrowBuilder,
		},
		{
			name: localization.linePen,
			id: 'line',

			factory: makeLineBuilder,
		},
		{
			name: localization.filledRectanglePen,
			id: 'filled-rectangle',

			factory: makeFilledRectangleBuilder,
		},
		{
			name: localization.outlinedRectanglePen,
			id: 'outlined-rectangle',

			factory: makeOutlinedRectangleBuilder,
		},
		{
			name: localization.outlinedCirclePen,
			id: 'outlined-circle',

			factory: makeOutlinedCircleBuilder,
		},
	];
};

const makePenToolSpecification = (
	tool: PenTool, context: ToolbarContext, penTypeFactories?: PenTypeRecord[]
): ToolButtonSpec => {
	const styleValue = tool.getStyleValue();
	const icon = mapReactiveValue(styleValue, style => {
		const result: IconSpec = {
			kind: IconType.PenTool,
			penStyle: style,
		};
		return result;
	});

	const colorValue = reactiveValueFromPropertyMutable(styleValue, 'color');

	penTypeFactories ??= getDefaultPenFactories(context.localization);
	const factoriesById = Object.create(null);
	for (const record of penTypeFactories) {
		factoriesById[record.id] = record.factory;
	}

	const enumItems = penTypeFactories.map(item => {
		const result: EnumInputChoice = {
			label: {
				title: item.name,
				icon: mapReactiveValue(styleValue, style => {
					return {
						kind: IconType.PenTool,
						penStyle: style,
					};
				}),
			},
			key: item.id,
		};
		return result;
	});

	const selectedFactory = reactiveValueFromPropertyMutable(styleValue, 'factory');
	const selectedFactoryId = mapReactiveValueMutable(
		selectedFactory,
		factory => {
			let firstId = '';
			for (const id in factoriesById) {
				firstId = id;

				if (factoriesById[id] === factory) {
					return id;
				}
			}

			return firstId;
		},
		id => factoriesById[id],
	);

	const menu: ToolbarWidgetSpec[] = [
		{
			kind: ToolbarWidgetType.ColorInput,
			label: {
				title: context.localization.colorLabel,
				icon: null,
			},
			value: colorValue,
		},
		{
			kind: ToolbarWidgetType.NumberInput,
			label: {
				title: context.localization.colorLabel,
				icon: null,
			},
			preferredType: NumberInputType.Slider,
			keys: [ 'thickness' ],

			min: 1,
			max: 400,
			step: 0.1,
			logScale: true,

			value: reactiveValueFromPropertyMutable(styleValue, 'thickness'),
		},
		{
			kind: ToolbarWidgetType.EnumInput,
			label: {
				title: context.localization.selectPenType,
				icon: null,
			},

			value: selectedFactoryId,
			choices: reactiveValueFromImmutable(enumItems),
		}
	];

	return makeToolButtonSpecification(tool, icon, [ 'pen' ], menu);
};

export default makePenToolSpecification;
