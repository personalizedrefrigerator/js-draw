import 'katex/dist/katex.css';
import './browser.scss';

import { join } from 'path';
import { __js_draw__version } from 'js-draw';
import replaceElementWithRunnableCode from './editor/replaceElementWithRunnableCode';
import { imagesPath } from './constants';


const initRunnableElements = async () => {
	const runnableElements = [...document.querySelectorAll('pre.runnable-code')] as HTMLTextAreaElement[];

	for (const runnable of runnableElements) {
		replaceElementWithRunnableCode(runnable);
	}
};

// Fix image URLs that are relative to the root of the repository
const fixImageURLs = () => {
	const images = document.querySelectorAll('img[src^="docs/img/"]') as NodeListOf<HTMLImageElement>;
	for (const image of images) {
		// Determine the path to the image relative to the docs/img/ directory
		const imagePath = image.src.replace(/^.*(docs[/]img[/])/, '');
		const newSrc = join(imagesPath, imagePath);
		image.src = newSrc;
	}
};

const replaceSidebarLinkLabels = () => {
	const replacements: Record<string, string> = (window as any).sidebarReplacements ?? {};
	const linkTexts = document.querySelectorAll('.site-menu > nav a > span') as NodeListOf<HTMLSpanElement>;

	for (const linkText of linkTexts) {
		if (linkText.innerText in replacements) {
			linkText.innerText = replacements[linkText.innerText].replaceAll('{{version}}', __js_draw__version.number);
		}
	}
};

window.addEventListener('DOMContentLoaded', () => {
	replaceSidebarLinkLabels();
	fixImageURLs();
});

window.addEventListener('load', async () => {
	await initRunnableElements();
});
