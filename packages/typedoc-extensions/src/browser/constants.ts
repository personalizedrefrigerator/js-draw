interface ExtendedWindow extends Window {
	basePath: string;
	assetsURL: string;
	imagesURL: string;
}

declare const window: ExtendedWindow;

export const basePath: string = window.basePath;
export const assetsPath: string = window.assetsURL;
export const imagesPath: string = window.imagesURL;
