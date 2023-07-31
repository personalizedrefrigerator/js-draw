import { ToolButtonSpec, ToolbarWidgetSpec, ToolbarWidgetType } from '../types';
import BaseTool from '../../../tools/BaseTool';
import ReactiveValue, { reactiveValueFromImmutable, reactiveValueFromInitialValue } from 'js-draw/src/util/ReactiveValue';
import { IconSpec } from '../icon';


const makeToolButtonSpecification = (
	tool: BaseTool,
	icon: ReactiveValue<IconSpec>|null,
	keys: string[],
	menu: ToolbarWidgetSpec[],
): ToolButtonSpec => {
	return {
		kind: ToolbarWidgetType.ToolButton,
		label: {
			title: tool.description,
			icon,
		},
		keys,
		menu: {
			open: reactiveValueFromInitialValue(false),
			items: reactiveValueFromImmutable(menu),
		},

		toolEnabled: tool.enabledValue(),
	};
};

export default makeToolButtonSpecification;
