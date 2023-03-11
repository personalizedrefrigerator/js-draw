import Color4 from '../Color4';
import Editor from '../Editor';
import LineSegment2 from '../math/LineSegment2';
import { Point2 } from '../math/Vec2';
import { PointerEvt } from '../types';
import BaseTool from './BaseTool';

class SoundFeedback {
	private ctx: AudioContext;

	// Feedback for the current color under the cursor
	private colorOscHue: OscillatorNode;
	private colorOscValue: OscillatorNode;
	private colorGain: GainNode;

	// Feedback for when the cursor crosses the boundary of some
	// component of the image.
	private boundaryOsc: OscillatorNode;
	private boundaryGain: GainNode;

	private closed: boolean = false;

	public constructor() {
		// No AudioContext? Exit!
		if (!window.AudioContext) {
			console.warn('Accessibility sound UI: Unable to open AudioContext.');
			this.closed = true;
			return;
		}

		this.ctx = new AudioContext();

		// Color oscillator and gain
		this.colorOscHue = this.ctx.createOscillator();
		this.colorOscValue = this.ctx.createOscillator();
		this.colorOscHue.type = 'triangle';
		this.colorOscValue.type = 'sine';

		this.colorGain = this.ctx.createGain();

		this.colorOscHue.connect(this.colorGain);
		this.colorOscValue.connect(this.colorGain);
		this.colorGain.connect(this.ctx.destination);

		// Boundary oscillator and gain
		this.boundaryGain = this.ctx.createGain();
		this.boundaryOsc = this.ctx.createOscillator();
		this.boundaryOsc.type = 'sawtooth';
		this.boundaryGain.gain.setValueAtTime(0, this.ctx.currentTime);

		this.boundaryOsc.connect(this.boundaryGain);
		this.boundaryGain.connect(this.ctx.destination);

		// Prepare for the first announcement/feedback.
		this.colorOscHue.start();
		this.colorOscValue.start();
		this.boundaryOsc.start();
		this.pause();
	}

	public pause() {
		if (this.closed) return;
		this.colorGain.gain.setValueAtTime(0, this.ctx.currentTime);
		void this.ctx.suspend();
	}

	public play() {
		if (this.closed) return;
		void this.ctx.resume();
	}

	public setColor(color: Color4) {
		const hsv = color.asHSV();
		const hueFrequency = Math.cos(hsv.x / 2) * 100 + hsv.y * 10 + 440;
		const valueFrequency = hsv.y * 440 + 220;

		// Sigmoid with maximum 0.25 * alpha.
		// Louder for greater value.
		const gain = 0.25 * Math.min(1, color.a) / (1 + Math.exp(-(hsv.z - 1) * 2));

		this.colorOscHue.frequency.setValueAtTime(hueFrequency, this.ctx.currentTime);
		this.colorOscValue.frequency.setValueAtTime(valueFrequency, this.ctx.currentTime);
		this.colorGain.gain.setValueAtTime(gain, this.ctx.currentTime);
	}

	public announceBoundaryCross(boundaryCrossCount: number) {
		this.boundaryGain.gain.cancelScheduledValues(this.ctx.currentTime);
		this.boundaryGain.gain.setValueAtTime(0, this.ctx.currentTime);
		this.boundaryGain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.1);
		this.boundaryOsc.frequency.setValueAtTime(440 + Math.atan(boundaryCrossCount / 2) * 100, this.ctx.currentTime);
		this.boundaryGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
	}

	public close() {
		this.ctx.close();
		this.closed = true;
	}
}

/**
 * This tool, when enabled, plays a sound representing the color of the portion of the display
 * currently under the cursor.
 * 
 * This allows the user to explore the content of the display without a working screen.
 */
export default class SoundUITool extends BaseTool {
	private soundFeedback: SoundFeedback|null = null;
	private toggleButton: HTMLElement;

	public constructor(
		private editor: Editor,
		description: string,
	) {
		super(editor.notifier, description);


		// Create a screen-reader-usable method of toggling the tool:
		const toggleButtonContainer = document.createElement('div');
		toggleButtonContainer.classList.add('js-draw-sound-ui-toggle');

		this.toggleButton = document.createElement('button');
		this.toggleButton.onclick = () => {
			this.setEnabled(!this.isEnabled());
		};
		toggleButtonContainer.appendChild(this.toggleButton);
		this.updateToggleButtonText();

		editor.createHTMLOverlay(toggleButtonContainer);
	}

	private updateToggleButtonText() {
		if (this.isEnabled()) {
			this.toggleButton.innerText = this.editor.localization.disableAccessibilityExploreTool;

		} else {
			this.toggleButton.innerText = this.editor.localization.enableAccessibilityExploreTool;
		}
	}

	public setEnabled(enabled: boolean): void {
		super.setEnabled(enabled);

		if (!enabled) {
			this.soundFeedback?.close();
			this.soundFeedback = null;
		}

		this.updateToggleButtonText();
	}

	private lastPointerPos: Point2;

	public onPointerDown({ current }: PointerEvt): boolean {
		if (!this.soundFeedback) {
			this.soundFeedback = new SoundFeedback();
		}

		// Accept multiple cursors -- some screen readers require multiple (touch) pointers to interact with
		// an image instead of using the built-in navigation features.

		this.soundFeedback?.play();
		this.soundFeedback?.setColor(this.editor.display.getColorAt(current.screenPos) ?? Color4.black);
		this.lastPointerPos = current.canvasPos;
		return true;
	}

	public onPointerMove({ current }: PointerEvt): void {
		this.soundFeedback?.setColor(this.editor.display.getColorAt(current.screenPos) ?? Color4.black);

		const pointerMotionLine = new LineSegment2(this.lastPointerPos, current.canvasPos);
		const collisions = this.editor.image.getElementsIntersectingRegion(pointerMotionLine.bbox).filter(
			component => component.intersects(pointerMotionLine)
		);
		this.lastPointerPos = current.canvasPos;
		
		if (collisions.length > 0) {
			this.soundFeedback?.announceBoundaryCross(collisions.length);
		}
	}

	public onPointerUp(_event: PointerEvt): void {
		this.soundFeedback?.pause();
	}

	public onGestureCancel(): void {
		this.soundFeedback?.pause();
	}
}
