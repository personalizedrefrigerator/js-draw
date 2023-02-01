import EditorImage from '../EditorImage';
import { AbstractComponent } from '../lib';
import SerializableCommand from './SerializableCommand';

export type ResolveFromComponentCallback = () => SerializableCommand;

/**
 * A command that requires a component that may or may not be present in the editor when
 * the command is created.
 */
export default abstract class UnresolvedSerializableCommand extends SerializableCommand {
	protected component: AbstractComponent|null;
	protected readonly componentID: string;

	protected constructor(
		commandId: string,
		componentID: string,
		component?: AbstractComponent
	) {
		super(commandId);
		this.component = component ?? null;
		this.componentID = componentID;
	}

	protected resolveComponent(image: EditorImage) {
		if (this.component) {
			return;
		}

		const component = image.lookupElement(this.componentID);
		if (!component) {
			throw new Error(`Unable to resolve component with ID ${this.componentID}`);
		}

		this.component = component;
	}
}