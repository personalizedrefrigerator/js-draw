//import * as jsdraw from 'js-draw';
//import 'js-draw/styles';
import * as jsdraw from '../../src/bundle/bundled';
import './style.css';

const editor = new jsdraw.Editor(document.body);
editor.addToolbar();

const clientId = `${(new Date().getTime())}-${Math.random()}`;


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
	lastCommandIdx: number;
}

type ProcessCommandCallback = (command: jsdraw.SerializableCommand)=> void;
const fetchUpdates = async (lastUpdateIndex: number, processCommand: ProcessCommandCallback): Promise<FetchResult> => {
	const data = await fetch('/commandsSince/' + lastUpdateIndex);
	const json = await data.json();

	if (!('commands' in json) || typeof json.commands.length !== 'number') {
		throw new Error('Response must have [commands] list.');
	}

	let lastCommandIdx = lastUpdateIndex;

	for (const commandJSON of json.commands) {
		if (!('id' in commandJSON) || !('data' in commandJSON) || typeof commandJSON.id !== 'number') {
			throw new Error('Command has invalid type');
		}

		console.assert(lastCommandIdx < commandJSON.id, 'IDs must increase!!!');
		lastCommandIdx = commandJSON.id;

		if (commandJSON.data.clientId === clientId) {
			continue;
		}

		try {
			const command = jsdraw.SerializableCommand.deserialize(commandJSON.data.data, editor);
			processCommand(command);
		} catch(e) {
			console.warn('Error parsing command', e);
		}
	}

	return {
		lastCommandIdx,
	};
};

editor.notifier.on(jsdraw.EditorEventType.CommandDone, evt => {
	// Type assertion.
	if (evt.kind !== jsdraw.EditorEventType.CommandDone) {
		throw new Error('Incorrect event type');
	}

	if (evt.command instanceof jsdraw.SerializableCommand) {
		postSerializedCommand(JSON.stringify({
			// Store the clientId so we don't apply commands we sent to the server
			clientId,

			data: evt.command.serialize()
		}));
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

	postSerializedCommand(JSON.stringify({
		clientId,
		data: jsdraw.invertCommand(evt.command).serialize()
	}));
});

const timeout = (delay: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, delay);
	});
};

(async () => {
	for (;;) {
		try {
			const updates = await fetchUpdates(lastUpdateIdx, command => {
				console.log('Applying', command);
				// .apply and .unapply don't dispatch CommandDone and CommandUndone events.
				command.apply(editor);
			});
			lastUpdateIdx = updates.lastCommandIdx;
		} catch(e) {
			console.warn('Error fetching updates', e);
		}

		// Fetch every 1 second...
		await timeout(1000);
	}
})();