import tokenizeMarkdown, { MarkdownToken, MarkdownTokenType } from './tokenizeMarkdown';

export enum RegionType {
	Text = 'text',
	Code = 'code',
	Math = 'math',
}

interface LabeledRegion {
	type: RegionType;
	block: boolean;

	content: string;

	// Content, including any delimiters
	fullText: string;

	start: number;
	stop: number;
}

interface StartInformation {
	readonly prevIsSpace: boolean;
	readonly prevIsNewline: boolean;
	readonly nextIsSpace: boolean;
	readonly nextIsNewline: boolean;
	readonly startToken: MarkdownToken;
}

const parseMarkdown = (markdown: string) => {
	const tokens = tokenizeMarkdown(markdown);

	if (tokens.length === 0) {
		return [];
	}

	const labeledRegions: LabeledRegion[] = [];

	const getSpaceInformationAt = (i: number) => {
		const prevIsSpace = i === 0 || tokens[i - 1].type === MarkdownTokenType.Space;
		const prevIsNewline = i === 0 || tokens[i - 1].text.endsWith('\n');
		const nextIsSpace = i === tokens.length - 1 || tokens[i + 1].type === MarkdownTokenType.Space;
		const nextIsNewline = i === tokens.length - 1 || tokens[i + 1].text.startsWith('\n');

		return {
			prevIsSpace,
			prevIsNewline,
			nextIsSpace,
			nextIsNewline,
		};
	};

	let currentRegionType = RegionType.Text;
	let buffer: MarkdownToken[] = [];
	let currentStartInformation: StartInformation = {
		...getSpaceInformationAt(0),
		startToken: tokens[0],
	};
	let currentInformation = getSpaceInformationAt(0);

	const bufferText = () => {
		return buffer.map((token) => token.text).join('');
	};

	const finalizeRegion = () => {
		const text = bufferText();
		const startToken = currentStartInformation.startToken;
		const start = startToken.position;

		// Only add non-empty regions.
		if (text.length === 0) {
			return;
		}

		if (currentRegionType === RegionType.Text) {
			labeledRegions.push({
				type: RegionType.Text,
				block: false,
				fullText: text,
				content: text,

				start,
				stop: start + text.length,
			});
		} else if (currentRegionType === RegionType.Code || currentRegionType === RegionType.Math) {
			const surroundedByNewlines =
				currentInformation.nextIsNewline && currentStartInformation.prevIsNewline;

			// Both code (```) and math ($$) delimiters are more than one
			// character if delimiting block regions.
			const delimiter = startToken.text;
			const hasBlockDelimiters = delimiter.length > 1;

			labeledRegions.push({
				type: currentRegionType,
				block: surroundedByNewlines && hasBlockDelimiters,
				fullText: text,
				content: buffer
					.slice(1, buffer.length - 1)
					.map((token) => token.text)
					.join(''),

				start,
				stop: start + text.length,
			});
		} else {
			const exhaustivenessCheck: never = currentRegionType;
			return exhaustivenessCheck;
		}

		buffer = [];
	};

	const startNewRegion = (type: RegionType, startInformation: StartInformation) => {
		finalizeRegion();

		currentStartInformation = startInformation;
		currentRegionType = type;
		buffer = [];
	};

	for (let i = 0; i < tokens.length; i++) {
		currentInformation = getSpaceInformationAt(i);
		const { prevIsSpace, prevIsNewline, nextIsSpace, nextIsNewline } = currentInformation;

		const current = tokens[i];
		const nextToken = i + 1 >= tokens.length ? null : tokens[i + 1];

		// Some tokens need to be added before processing and others
		// after. addCurrentToBuffer ensures that this only happens once
		// for each token.
		let addedToBuffer = false;
		const addCurrentToBuffer = () => {
			if (!addedToBuffer) {
				buffer.push(current);
				addedToBuffer = true;
			}
		};

		if (currentRegionType === RegionType.Text) {
			const startInformation: StartInformation = {
				...currentInformation,
				startToken: current,
			};
			// Text -> code
			if (prevIsSpace && current.type === MarkdownTokenType.CodeDelim) {
				startNewRegion(RegionType.Code, startInformation);
			}
			// Text -> math
			else if (
				current.type === MarkdownTokenType.MathDelim &&
				((prevIsSpace && !nextIsSpace && current.text === '$') ||
					(prevIsNewline && current.text === '$$'))
			) {
				startNewRegion(RegionType.Math, startInformation);
			}
		} else {
			const startInformation: StartInformation = {
				...currentInformation,
				startToken: nextToken ?? current,
			};
			// Add the current to the buffer before starting a new region --
			// we want the ending tokens to be included in math/code regions.
			addCurrentToBuffer();

			// Delimiter at the start of the code/math region
			const enterDelim = currentStartInformation.startToken.text;
			const inlineDelim = enterDelim.length === 1;

			if (
				inlineDelim &&
				// if we're at the end of the line
				((current.type === MarkdownTokenType.Space && current.text.includes('\n')) ||
					// or there was a space just before the delimiter and it's math
					(prevIsSpace && current.type === MarkdownTokenType.MathDelim))
			) {
				// Switch the region to text and backtrack to the
				// token just after the start of the region.
				currentRegionType = RegionType.Text;
				for (; i > startInformation.startToken.position; i--) {
					buffer.pop();
				}
			} else if (currentRegionType === RegionType.Code) {
				// Code -> text
				if (
					current.type === MarkdownTokenType.CodeDelim &&
					current.text.length >= enterDelim.length
				) {
					startNewRegion(RegionType.Text, startInformation);
				}
			} else if (currentRegionType === RegionType.Math) {
				const enterDelim = currentStartInformation.startToken.text;

				// Math -> text
				if (current.type === MarkdownTokenType.MathDelim && enterDelim === current.text) {
					if ((current.text === '$$' && nextIsNewline) || current.text === '$') {
						startNewRegion(RegionType.Text, startInformation);
					}
				}
			} else {
				const exhaustivenessCheck: never = currentRegionType;
				return exhaustivenessCheck;
			}
		}

		addCurrentToBuffer();
	}

	finalizeRegion();

	// Coalesce -- join neighboring regions of the same type
	// where appliccable.
	const coalescedRegions: LabeledRegion[] = [];

	for (let i = 0; i < labeledRegions.length; i++) {
		const current = labeledRegions[i];
		const previous = i > 0 ? coalescedRegions[i - 1] : null;

		// Join neighboring blocks of text.
		if (
			current.type === RegionType.Text &&
			previous?.type === RegionType.Text &&
			current.block === previous.block
		) {
			const text = previous.fullText + current.fullText;

			coalescedRegions.pop();
			coalescedRegions.push({
				type: RegionType.Text,
				block: previous.block,
				start: previous.start,
				stop: current.stop,
				fullText: text,
				content: text,
			});
		} else {
			coalescedRegions.push(current);
		}
	}

	return coalescedRegions;
};

export default parseMarkdown;
