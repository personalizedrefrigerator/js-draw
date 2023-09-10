import 'katex/dist/katex.css';
import './browser.scss';

import { join } from 'path';
import { __js_draw__version } from 'js-draw';
import replaceElementWithRunnableCode from './editor/replaceElementWithRunnableCode';
import { imagesPath, basePath } from './constants';


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

// Works around a TypeDoc bug where cross-module links don't work.
const replaceInternalPackageToPackageLinks = () => {
	const linksToReplace = document.querySelectorAll('a[data--module]');

	for (const link of linksToReplace) {
		const moduleTarget = link.getAttribute('data--module');
		const propertyName = link.getAttribute('data--name');

		if (moduleTarget) {
			const href = join(basePath, 'modules', moduleTarget + '.html') + `?find-name=${propertyName}`;

			link.setAttribute('target', '');
			link.setAttribute('href', href);
			link.classList.remove('external');
		}
	}
};

// Used indirectly by replaceInternalPackageToPackageLinks
const navigateBasedOnURL = () => {
	const urlMatch = window.location.href.match(/[?]find-name=([a-zA-Z_0-9=@]+)/i);
	if (urlMatch) {
		const target = urlMatch[1];

		const candidateLinks = document.querySelectorAll('a.tsd-index-link') as NodeListOf<HTMLAnchorElement>;
		for (const link of candidateLinks) {
			const label = link.querySelector('span');
			if (label && label.innerText === target) {
				link.click();
				return;
			}
		}
	}
};

window.addEventListener('DOMContentLoaded', () => {
	fixImageURLs();
	replaceInternalPackageToPackageLinks();
	navigateBasedOnURL();
});

window.addEventListener('load', async () => {
	await initRunnableElements();
});

(window as any).navigateTo = (packageName: string, _exportName: string) => {
	location.replace(join(basePath, packageName.replace(/[^a-zA-Z_0-9]/g, '_') + '.html'));
};
