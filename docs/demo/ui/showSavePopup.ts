
// Imports from js-draw. Because thsi file is part of the js-draw
// workspace, we use a relative path to impor these.
import { Vec2, Editor } from 'js-draw';
import { Localization } from '../localization';

import ImageSaver from '../storage/ImageSaver';

/** Saves [editor]'s content as an SVG and displays the result. */
const showSavePopup = (
	// Set of strings that (hopefully) match the user's language.
	localization: Localization,

	// Data to save
	img: SVGElement,

	// Editor the data was taken from
	editor: Editor,

	// Where data will be written to.
	imageSaver: ImageSaver,

	// Called when data has been saved successfully.
	onSaveSuccess: ()=>void,
) => {
	let imgHTML = img.outerHTML;

	const popupContainer = document.createElement('dialog');
	popupContainer.classList.add('popupContainer');
	popupContainer.appendChild(document.createTextNode('Saving...'));
	document.body.appendChild(popupContainer);

	const popupIframe = document.createElement('iframe');
	popupIframe.src = 'about:blank';

	// Turn on sandboxing -- the user may attempt to display the SVG directly in the sandbox.
	// Allow-scripts is required by Safari on iOS to have click listeners on buttons.
	// TODO: Check whether this is still the case and remove allow-scripts if no longer necessary.
	popupIframe.setAttribute('sandbox', 'allow-same-origin allow-downloads allow-scripts');
	popupIframe.setAttribute('csp', 'default-src \'about:blank\'');
	popupContainer.replaceChildren(popupIframe);

	const popup = popupIframe.contentWindow!;
	const popupDoc = popupIframe.contentDocument!;

	if (popup === null) {
		throw new Error('Unable to open save popup!');
	}

	popupDoc.open();
	popupDoc.write(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta name='viewport' content='initial-scale=1.0'/>
			<meta charset='utf-8'/>
		</head>
		<body>
			<style>
				#previewRegion {
					display: flex;
					flex-direction: row;
				}

				svg {
					height: auto;
					width: auto;
					max-width: 500px;
					max-height: 100vh;
					flex-grow: 1;
					border: 1px solid gray;
				}

				textarea {
					flex-grow: 1;
					flex-shrink: 1;
					width: auto;
				}

				main {
					border: 1px solid gray;
					background-color: #eee;
					font-family: sans-serif;

					max-width: 600px;
					margin-left: auto;
					margin-right: auto;

					padding: 15px;
					border-radius: 15px;
				}

				#controlsArea {
					display: flex;
					flex-direction: row;
					margin-top: 14px;
				}

				#controlsArea button {
					flex-grow: 1;
				}

				body, :root {
					background-color: rgba(255, 255, 255, 0.0);
				}

				:root {
					height: 100vh;
				}

				button {
					min-height: 35px;
				}

				@media (prefers-color-scheme: dark) {
					body, :root {
						background-color: rgba(0, 0, 0, 0.0);
						color: white;
					}

					main {
						background-color: #333;
					}

					a {
						color: pink;
					}

					input, button {
						background-color: #444;
						color: #eee;
						border: 1px solid #222;
						border-radius: 2px;

						transition: background-color 0.2s ease;
					}

					button:focus-visible, input:focus-visible {
						outline: 3px solid #777;
						background-color: #555;
					}

					button:active {
						background-color: #333;
					}
				}
			</style>
			<main>
				<div id='previewRegion'>
					<p>Saving to
						<code>${imageSaver.title.replace(/[<>&]/g, '')}</code>...
					</p>
				</div>
				<div><label id='filenameLabel' for='filename'>Title: </label><input id='filename' type='text'/></div>
				<div id='controlsArea'>
				</div>
			</main>
		</body>
		</html>`
	);
	popupDoc.close();

	popupContainer.show();

	// Loading the preview can be much slower than saving the image.
	// Only do so if requested.
	const previewRegion = popupDoc.querySelector('#previewRegion')!;

	const filenameLabel = popupDoc.querySelector('#filenameLabel')! as HTMLLabelElement;
	filenameLabel.innerText = localization.imageTitleLabel;

	const previewSVGButton = popupDoc.createElement('button');
	const previewPNGButton = popupDoc.createElement('button');

	previewSVGButton.innerText = localization.viewGeneratedSVGImage;
	previewPNGButton.innerText = localization.viewGeneratedPNGImage;

	previewSVGButton.onclick = () => {
		const messageContainer = popupDoc.createElement('p');
		const svgTextContainer = popupDoc.createElement('textarea');
		const saveChangesButton = popupDoc.createElement('button');

		// Add a button that allows saving changes made in the textarea.
		saveChangesButton.style.display = 'none';
		saveChangesButton.innerText = localization.save;
		saveChangesButton.onclick = async () => {
			imgHTML = svgTextContainer.value;
			await writeImage(imgHTML);
			saveChangesButton.style.display = 'none';
		};

		const imagePreview = popupDoc.createElement('img');
		imagePreview.style.width = '150px';
		imagePreview.style.flexGrow = '4';
		imagePreview.style.flexShrink = '1';

		const updatePreview = (content: string) => {
			// Convert unicode characters to base64. See https://stackoverflow.com/a/75155959
			// TODO: simplify
			const encoded = window.btoa(
				String.fromCharCode(...new TextEncoder().encode(content))
			);

			imagePreview.src = 'data:image/svg+xml;base64,' + encoded;
		};
		updatePreview(imgHTML);

		messageContainer.innerText = localization.previewLabel;
		svgTextContainer.value = imgHTML;

		svgTextContainer.oninput = () => {
			updatePreview(svgTextContainer.value);
			saveChangesButton.style.display = 'block';
		};

		previewRegion.replaceChildren(
			messageContainer, svgTextContainer, imagePreview, saveChangesButton
		);
	};

	previewPNGButton.onclick = () => {
		const imagePreview = popupDoc.createElement('img');
		imagePreview.src = editor.toDataURL();
		imagePreview.style.maxWidth = '100%';
		previewRegion.replaceChildren(imagePreview);
	};

	const filenameInput: HTMLInputElement = popupDoc.querySelector('input#filename')!;
	filenameInput.value = imageSaver.title;

	const downloadButton = popup.document.createElement('button');
	downloadButton.innerText = localization.download;
	downloadButton.onclick = () => {
		const blob = new Blob([ imgHTML ], { type: 'image/svg' });
		const objectURL = URL.createObjectURL(blob);

		const link = popup.document.createElement('a');
		link.href = objectURL;
		link.innerText = localization.download;

		let downloadAs = filenameInput.value;
		if (!downloadAs.endsWith('.svg')) {
			downloadAs += '.svg';
		}

		// Download as (Ref: https://stackoverflow.com/a/52814195/17055750)
		link.setAttribute('download', downloadAs);

		downloadButton.style.display = 'none';
		popupControlsArea.appendChild(link);
		link.click();

		// Release URL (see section on object URLs in
		// https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
		link.remove();
		URL.revokeObjectURL(objectURL);
	};

	let updateTitleQueued = false;
	const updateTitle = async () => {
		if (imageSaver.updateTitle && imageSaver.title !== filenameInput.value) {
			await imageSaver.updateTitle(filenameInput.value);

			updateTitleQueued = false;
		}
	};
	const queueUpdateTitle = () => {
		if (!updateTitleQueued) {
			updateTitleQueued = true;
			setTimeout(updateTitle, 500);
		}
	};

	filenameInput.oninput = async () => {
		downloadButton.style.display = 'block';
		queueUpdateTitle();
	};

	const closeButton = popup.document.createElement('button');
	closeButton.innerText = localization.close;

	const closePopup = () => {
		updateTitle();
		popupContainer.remove();
	};

	closeButton.onclick = () => {
		closePopup();
	};
	popupDoc.documentElement.onclick = (event) => {
		if (event.target === popupDoc.documentElement) {
			closePopup();
		}
	};

	const popupControlsArea = popup.document.querySelector('main > #controlsArea')!;
	popupControlsArea.appendChild(closeButton);
	popupControlsArea.appendChild(previewSVGButton);
	popupControlsArea.appendChild(previewPNGButton);
	popupControlsArea.appendChild(downloadButton);

	const writeImage = async (svgText: string) => {
		let imageSize = `${Math.round(svgText.length / 1024 * 10) / 10} KiB`;
		if (svgText.length > 1024 * 1024) {
			imageSize = `${Math.round(svgText.length / 1024 * 10 / 1024) / 10} MiB`;
		}

		let saveStatus = localization.savedAs(imageSaver.title);
		let error;

		try {
			await imageSaver.write(svgText);

			if (imageSaver.updatePreview) {
				const format = undefined;
				const size = Vec2.of(80, 80);
				await imageSaver.updatePreview(editor.toDataURL(format, size));
			}
		} catch (e) {
			saveStatus = 'Error: ' + e;
			error = e;
		}

		previewRegion.replaceChildren(
			popup.document.createTextNode(saveStatus),
			popup.document.createTextNode(' '),
			popup.document.createTextNode(
				localization.imageSize(imageSize)
			),
		);

		if (!error) {
			onSaveSuccess();
		}
	};
	void writeImage(imgHTML);
};

export default showSavePopup;
