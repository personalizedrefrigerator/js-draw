import * as jsdraw from '../../src/bundle/bundled';
import './style.css';

// import jsdraw from 'js-draw/bundle';

const editor = new jsdraw.Editor(document.body);
editor.addToolbar();


let lastUpdateIdx = 0;
const postSerializedCommand = async (data: string) => {
	await fetch('/postCommand', {
		method: 'POST',
		body: data,
	});
	lastUpdateIdx ++;
	console.log('Posted', data);
};

interface FetchResult {
	commands: jsdraw.SerializableCommand[];
	lastCommandIdx: number;
}

const fetchUpdates = async (lastUpdateIndex: number): Promise<FetchResult> => {
	const data = await fetch('/commandsSince/' + lastUpdateIndex);
	const json = await data.json();

	if (!('commands' in json) || typeof json.commands.length !== 'number') {
		throw new Error('Response must have [commands] list.');
	}

	let lastCommandIdx = lastUpdateIndex;
	const commands: jsdraw.SerializableCommand[] = [];

	for (const command of json.commands) {
		if (!('id' in command) || !('data' in command) || typeof command.id !== 'number') {
			throw new Error('Command has invalid type');
		}

		lastCommandIdx = command.id;
		try {
			commands.push(jsdraw.SerializableCommand.deserialize(command.data, editor));
		} catch(e) {
			console.warn('Error parsing command', e);
		}
	}

	return {
		lastCommandIdx,
		commands,
	};
};

editor.notifier.on(jsdraw.EditorEventType.CommandDone, evt => {
	// Type assertion.
	if (evt.kind !== jsdraw.EditorEventType.CommandDone) {
		throw new Error('Incorrect event type');
	}

	if (evt.command instanceof jsdraw.SerializableCommand) {
		postSerializedCommand(JSON.stringify(evt.command.serialize()));
	} else {
		console.log('!', evt.command, 'instanceof jsdraw.SerializableCommand');
	}
});

editor.notifier.on(jsdraw.EditorEventType.CommandUndone, evt => {
	if (evt.kind !== jsdraw.EditorEventType.CommandUndone) {
		return;
	}

	if (!(evt.command instanceof jsdraw.SerializableCommand)) {
		console.log('Not serializable!', evt.command);
		return;
	}

	postSerializedCommand(JSON.stringify(jsdraw.invertCommand(evt.command).serialize()));
});

const timeout = (delay: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, delay);
	});
};

(async () => {
	for (;;) {
		try {
			const updates = await fetchUpdates(lastUpdateIdx);
			lastUpdateIdx = updates.lastCommandIdx;

			for (const command of updates.commands) {
				console.log('Applying', command);
				// .apply and .unapply don't dispatch CommandDone and CommandUndone events.
				command.apply(editor);
			}
		} catch(e) {
			console.warn('Error fetching updates', e);
		}

		// Fetch every 1 second...
		await timeout(1000);
	}
})();