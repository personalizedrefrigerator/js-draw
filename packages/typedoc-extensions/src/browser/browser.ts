import 'katex/dist/katex.css';
import './browser.scss';

import { join } from 'path';
import replaceElementWithRunnableCode from './editor/replaceElementWithRunnableCode';
import { imagesPath, basePath } from './constants';


const initRunnableElements = () => {
	const runnableElements = [...document.querySelectorAll('pre.runnable-code')] as HTMLTextAreaElement[];

	for (const runnable of runnableElements) {
		replaceElementWithRunnableCode(runnable);
	}
};

// Fix image URLs that are relative to the root of the repository
const fixImageURLs = () => {
	const images = document.querySelectorAll<HTMLImageElement>('img[src^="docs/img/"]');
	for (const image of images) {
		// Determine the path to the image relative to the docs/img/ directory
		const imagePath = image.src.replace(/^.*(docs[/]img[/])/, '');
		const newSrc = join(imagesPath, imagePath);
		image.src = newSrc;
	}
};

// Works around a TypeDoc bug where cross-module links don't work.
const replaceInternalPackageToPackageLinks = () => {
	const linksToReplace = [
		...document.querySelectorAll('a[href^="data:text/plain;utf-8,corrected-link="]'),
	];

	for (const link of linksToReplace) {
		const hrefRegex = /^data:text\/plain;utf-8,corrected-link=([^,]+),([^,]+)$/;
		const hrefMatch = (link.getAttribute('href') ?? '').match(hrefRegex);

		if (hrefMatch) {
			const moduleTarget = hrefMatch[1];
			const propertyName = hrefMatch[2];

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

		const candidateLinks = document.querySelectorAll<HTMLAnchorElement>('a.tsd-index-link');
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

window.addEventListener('load', () => {
	initRunnableElements();
});

(window as any).navigateTo = (packageName: string, _exportName: string) => {
	location.replace(join(basePath, packageName.replace(/[^a-zA-Z_0-9]/g, '_') + '.html'));
};
