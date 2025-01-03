import Vec3 from './Vec3';

/**
 * Represents a color.
 *
 * @example
 * ```ts,runnable,console
 * import { Color4 } from '@js-draw/math';
 *
 * console.log('Red:', Color4.fromString('#f00'));
 * console.log('Also red:', Color4.ofRGB(1, 0, 0), Color4.red);
 * console.log('Mixing red and blue:', Color4.red.mix(Color4.blue, 0.5));
 * console.log('To string:', Color4.orange.toHexString());
 * ```
 */
export class Color4 {
	private constructor(
		/** Red component. Should be in the range [0, 1]. */
		public readonly r: number,

		/** Green component. ${\tt g} \in [0, 1]$ */
		public readonly g: number,

		/** Blue component. ${\tt b} \in [0, 1]$ */
		public readonly b: number,

		/** Alpha/transparent component. ${\tt a} \in [0, 1]$. 0 = transparent */
		public readonly a: number,
	) {}

	/**
	 * Create a color from red, green, blue components. The color is fully opaque (`a = 1.0`).
	 *
	 * Each component should be in the range [0, 1].
	 */
	public static ofRGB(red: number, green: number, blue: number): Color4 {
		return Color4.ofRGBA(red, green, blue, 1.0);
	}

	/**
	 * Creates a color from red, green, blue, and transparency components. Each component should
	 * be in the range $[0, 1]$.
	 */
	public static ofRGBA(red: number, green: number, blue: number, alpha: number): Color4 {
		red = Math.max(0, Math.min(red, 1));
		green = Math.max(0, Math.min(green, 1));
		blue = Math.max(0, Math.min(blue, 1));
		alpha = Math.max(0, Math.min(alpha, 1));

		return new Color4(red, green, blue, alpha);
	}

	/**
	 * Creates a color from an RGB (or RGBA) array.
	 *
	 * This is similar to {@link ofRGB} and {@link ofRGBA}, but, by default, takes values
	 * that range from 0 to 255.
	 *
	 * If the array values instead range from 0-1, pass `maxValue` as `1`.
	 */
	public static fromRGBArray(
		array: Uint8Array | Uint8ClampedArray | number[],
		maxValue: number = 255,
	) {
		const red = array[0];
		const green = array[1] ?? red;
		const blue = array[2] ?? red;

		let alpha = 255;
		if (3 < array.length) {
			alpha = array[3];
		}

		return Color4.ofRGBA(red / maxValue, green / maxValue, blue / maxValue, alpha / maxValue);
	}

	/**
	 * Creates a `Color4` from a three or four-component hexadecimal
	 * [color string](https://en.wikipedia.org/wiki/Web_colors#Hex_triplet).
	 *
	 * Example:
	 * ```ts,runnable,console
	 * import { Color4 } from '@js-draw/math';
	 * console.log(Color4.fromHex('#ff0'));
	 * ```
	 */
	public static fromHex(hexString: string): Color4 {
		// Remove starting '#' (if present)
		hexString = (hexString.match(/^[#]?(.*)$/) ?? [])[1];
		hexString = hexString.toUpperCase();

		if (!hexString.match(/^[0-9A-F]+$/)) {
			throw new Error(`${hexString} is not in a valid format.`);
		}

		// RGBA or RGB
		if (hexString.length === 3 || hexString.length === 4) {
			// Each character is a component
			const components = hexString.split('');

			// Convert to RRGGBBAA or RRGGBB format
			hexString = components.map((component) => `${component}0`).join('');
		}

		if (hexString.length === 6) {
			// Alpha component
			hexString += 'FF';
		}

		const components: number[] = [];
		for (let i = 2; i <= hexString.length; i += 2) {
			const chunk = hexString.substring(i - 2, i);
			components.push(parseInt(chunk, 16) / 255);
		}

		if (components.length !== 4) {
			throw new Error(`Unable to parse ${hexString}: Wrong number of components.`);
		}

		return Color4.ofRGBA(components[0], components[1], components[2], components[3]);
	}

	/** Like {@link fromHex}, but can handle additional colors if an `HTMLCanvasElement` is available. */
	public static fromString(text: string): Color4 {
		if (text.startsWith('#')) {
			return Color4.fromHex(text);
		}

		if (text === 'none' || text === 'transparent') {
			return Color4.transparent;
		}

		if (text === '') {
			return Color4.black;
		}

		// rgba?: Match both rgb and rgba strings.
		// ([,0-9.]+): Match any string of only numeric, '.' and ',' characters.
		const rgbRegex = /^rgba?\(([,0-9.]+)\)$/i;
		const rgbMatch = text.replace(/\s*/g, '').match(rgbRegex);

		if (rgbMatch) {
			const componentsListStr = rgbMatch[1];
			const componentsList = JSON.parse(`[ ${componentsListStr} ]`);

			if (componentsList.length === 3) {
				return Color4.ofRGB(
					componentsList[0] / 255,
					componentsList[1] / 255,
					componentsList[2] / 255,
				);
			} else if (componentsList.length === 4) {
				return Color4.ofRGBA(
					componentsList[0] / 255,
					componentsList[1] / 255,
					componentsList[2] / 255,
					componentsList[3],
				);
			} else {
				throw new Error(
					`RGB string, ${text}, has wrong number of components: ${componentsList.length}`,
				);
			}
		}

		// Otherwise, try to use an HTMLCanvasElement to determine the color.
		// Note: We may be unable to create an HTMLCanvasElement if running as a unit test.
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;

		const ctx = canvas.getContext('2d');

		// Default to black if no canvas is available.
		if (!ctx) {
			return Color4.black;
		}

		ctx.fillStyle = text;
		ctx.fillRect(0, 0, 1, 1);

		const data = ctx.getImageData(0, 0, 1, 1);
		const red = data.data[0] / 255;
		const green = data.data[1] / 255;
		const blue = data.data[2] / 255;
		const alpha = data.data[3] / 255;

		return Color4.ofRGBA(red, green, blue, alpha);
	}

	/** @returns true if `this` and `other` are approximately equal. */
	public eq(other: Color4 | null | undefined): boolean {
		if (other == null) {
			return false;
		}

		// If both completely transparent,
		if (this.a === 0 && other.a === 0) {
			return true;
		}

		return this.toHexString() === other.toHexString();
	}

	/**
	 * If `fractionTo` is not in the range $[0, 1]$, it will be clamped to the nearest number
	 * in that range. For example, `a.mix(b, -1)` is equivalent to `a.mix(b, 0)`.
	 *
	 * @returns a color `fractionTo` of the way from this color to `other`.
	 *
	 * @example
	 * ```ts
	 * Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 1, 0), 0.1) // -> Color4(0.9, 0.1, 0)
	 * ```
	 */
	public mix(other: Color4, fractionTo: number): Color4 {
		fractionTo = Math.min(Math.max(fractionTo, 0), 1);
		const fractionOfThis = 1 - fractionTo;
		return new Color4(
			this.r * fractionOfThis + other.r * fractionTo,
			this.g * fractionOfThis + other.g * fractionTo,
			this.b * fractionOfThis + other.b * fractionTo,
			this.a * fractionOfThis + other.a * fractionTo,
		);
	}

	/** Returns a new color with a different opacity. */
	public withAlpha(a: number) {
		return new Color4(this.r, this.g, this.b, a);
	}

	/**
	 * Ignoring this color's alpha component, returns a vector with components,
	 * $$
	 * \begin{pmatrix} \colorbox{#F44}{\tt r} \\ \colorbox{#4F4}{\tt g} \\ \colorbox{#44F}{\tt b} \end{pmatrix}
	 * $$
	 */
	public get rgb() {
		return Vec3.of(this.r, this.g, this.b);
	}

	/**
	 * Returns the [relative luminance](https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef)
	 * of this color in the sRGB color space.
	 *
	 * Ignores the alpha component.
	 */
	public relativeLuminance(): number {
		// References:
		// - https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
		// - https://stackoverflow.com/a/9733420

		// Normalize the components, as per above
		const components = [this.r, this.g, this.b].map((component) => {
			if (component < 0.03928) {
				return component / 12.92;
			} else {
				return Math.pow((component + 0.055) / 1.055, 2.4);
			}
		});

		// From w3.org,
		// > For the sRGB colorspace, the relative luminance of a color is
		// > defined as L = 0.2126 * R + 0.7152 * G + 0.0722 * B
		// where R, G, B are defined in components above.
		return 0.2126 * components[0] + 0.7152 * components[1] + 0.0722 * components[2];
	}

	/**
	 * Returns the [contrast ratio](https://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef)
	 * between `colorA` and `colorB`.
	 */
	public static contrastRatio(colorA: Color4, colorB: Color4): number {
		const L1 = colorA.relativeLuminance();
		const L2 = colorB.relativeLuminance();

		return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
	}

	/**
	 * @returns the component-wise average of `colors`, or `Color4.transparent` if `colors` is empty.
	 */
	public static average(colors: Color4[]) {
		let averageA = 0;
		let averageR = 0;
		let averageG = 0;
		let averageB = 0;

		for (const color of colors) {
			averageA += color.a;
			averageR += color.r;
			averageG += color.g;
			averageB += color.b;
		}

		if (colors.length > 0) {
			averageA /= colors.length;
			averageR /= colors.length;
			averageG /= colors.length;
			averageB /= colors.length;
		}

		return new Color4(averageR, averageG, averageB, averageA);
	}

	/**
	 * Converts to (hue, saturation, value).
	 * See also https://en.wikipedia.org/wiki/HSL_and_HSV#General_approach
	 *
	 * The resultant hue is represented in radians and is thus in $[0, 2\pi]$.
	 */
	public asHSV(): Vec3 {
		// Ref: https://en.wikipedia.org/wiki/HSL_and_HSV#General_approach
		//
		// HUE:
		// First, consider the unit cube. Rotate it such that one vertex is at the origin
		// of a plane and its three neighboring vertices are equidistant from that plane:
		//
		//         /\
		//       /  | \
		//   2 /    3   \ 1
		//     \    |   /
		//       \  | /
		//   .     \/      .
		//
		//        .
		//
		// Let z be up and (x, y, 0) be in the plane.
		//
		// Label vectors 1,2,3 with R, G, and B, respectively. Let R's projection into the plane
		// lie along the x axis.
		//
		// Because R is a unit vector and R, G, B are equidistant from the plane, they must
		// form 30-60-90 triangles, which have side lengths proportional to (1, √3, 2)
		//
		//       /|
		//    1/  | (√3)/2
		//    /   |
		//      1/2
		//
		const minComponent = Math.min(this.r, this.g, this.b);
		const maxComponent = Math.max(this.r, this.g, this.b);
		const chroma = maxComponent - minComponent;

		let hue;

		// See https://en.wikipedia.org/wiki/HSL_and_HSV#General_approach
		if (chroma === 0) {
			hue = 0;
		} else if (this.r >= this.g && this.r >= this.b) {
			hue = ((this.g - this.b) / chroma) % 6;
		} else if (this.g >= this.r && this.g >= this.b) {
			hue = (this.b - this.r) / chroma + 2;
		} else {
			hue = (this.r - this.g) / chroma + 4;
		}

		// Convert to degree representation, then to radians.
		hue *= 60;
		hue *= Math.PI / 180;

		// Ensure positivity.
		if (hue < 0) {
			hue += Math.PI * 2;
		}

		const value = maxComponent;
		const saturation = value > 0 ? chroma / value : 0;

		return Vec3.of(hue, saturation, value);
	}

	/**
	 * Creates a new `Color4` from a representation [in $HSV$](https://en.wikipedia.org/wiki/HSL_and_HSV#HSV_to_RGB).
	 *
	 * [Algorithm](https://en.wikipedia.org/wiki/HSL_and_HSV#HSV_to_RGB).
	 *
	 * Note that hue must be given **in radians**. While non-standard, this is consistent with
	 * {@link asHSV}.
	 *
	 * `hue` and `value` should range from 0 to 1.
	 *
	 * @param hue $H \in [0, 2\pi]$
	 * @param saturation $S_V \in [0, 1]$
	 * @param value $V \in [0, 1]$
	 */
	public static fromHSV(hue: number, saturation: number, value: number) {
		if (hue < 0) {
			hue += Math.PI * 2;
		}
		hue %= Math.PI * 2;

		// Clamp value and saturation to [0, 1]
		value = Math.max(0, Math.min(1, value));
		saturation = Math.max(0, Math.min(1, saturation));

		// Formula from https://en.wikipedia.org/wiki/HSL_and_HSV#HSV_to_RGB

		// Saturation can be thought of as scaled chroma. Unapply the scaling.
		// See https://en.wikipedia.org/wiki/HSL_and_HSV#Saturation
		const chroma = value * saturation;

		// Determines which edge of the projected color cube
		const huePrime = hue / (Math.PI / 3);

		const secondLargestComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

		let rgb;
		if (huePrime < 1) {
			rgb = [chroma, secondLargestComponent, 0];
		} else if (huePrime < 2) {
			rgb = [secondLargestComponent, chroma, 0];
		} else if (huePrime < 3) {
			rgb = [0, chroma, secondLargestComponent];
		} else if (huePrime < 4) {
			rgb = [0, secondLargestComponent, chroma];
		} else if (huePrime < 5) {
			rgb = [secondLargestComponent, 0, chroma];
		} else {
			rgb = [chroma, 0, secondLargestComponent];
		}

		const adjustment = value - chroma;
		return Color4.ofRGB(rgb[0] + adjustment, rgb[1] + adjustment, rgb[2] + adjustment);
	}

	/**
	 * Equivalent to `ofRGB(rgb.x, rgb.y, rgb.z)`.
	 *
	 * All components should be in the range `[0, 1]` (0 to 1 inclusive).
	 */
	public static fromRGBVector(rgb: Vec3, alpha?: number) {
		return Color4.ofRGBA(rgb.x, rgb.y, rgb.z, alpha ?? 1);
	}

	private hexString: string | null = null;

	/**
	 * @returns a hexadecimal color string representation of `this`, in the form `#rrggbbaa`.
	 *
	 * @example
	 * ```
	 * Color4.red.toHexString(); // -> #ff0000ff
	 * ```
	 */
	public toHexString(): string {
		if (this.hexString) {
			return this.hexString;
		}

		const componentToHex = (component: number): string => {
			const res = Math.round(255 * component).toString(16);

			if (res.length === 1) {
				return `0${res}`;
			}
			return res;
		};

		const alpha = componentToHex(this.a);
		const red = componentToHex(this.r);
		const green = componentToHex(this.g);
		const blue = componentToHex(this.b);
		if (alpha === 'ff') {
			return `#${red}${green}${blue}`;
		}
		this.hexString = `#${red}${green}${blue}${alpha}`;
		return this.hexString;
	}

	public toString() {
		return this.toHexString();
	}

	public static transparent = Color4.ofRGBA(0, 0, 0, 0);
	public static red = Color4.ofRGB(1.0, 0.0, 0.0);
	public static orange = Color4.ofRGB(1.0, 0.65, 0.0);
	public static green = Color4.ofRGB(0.0, 1.0, 0.0);
	public static blue = Color4.ofRGB(0.0, 0.0, 1.0);
	public static purple = Color4.ofRGB(0.5, 0.2, 0.5);
	public static yellow = Color4.ofRGB(1, 1, 0.1);
	public static clay = Color4.ofRGB(0.8, 0.4, 0.2);
	public static black = Color4.ofRGB(0, 0, 0);
	public static gray = Color4.ofRGB(0.5, 0.5, 0.5);
	public static white = Color4.ofRGB(1, 1, 1);
}

export default Color4;
