import Editor from '../Editor';
import { LineSegment2, Color4, Point2 } from '@js-draw/math';
import { KeyPressEvent, PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';

class SoundFeedback {
	private ctx: AudioContext;

	// Feedback for the current color under the cursor
	private colorOscHue: OscillatorNode;
	private colorOscValue: OscillatorNode;
	private colorOscSaturation: OscillatorNode;
	private valueGain: GainNode;
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
		this.colorOscSaturation = this.ctx.createOscillator();
		this.colorOscHue.type = 'triangle';
		this.colorOscSaturation.type = 'sine';
		this.colorOscValue.type = 'sawtooth';

		this.valueGain = this.ctx.createGain();
		this.colorOscValue.connect(this.valueGain);
		this.valueGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

		this.colorGain = this.ctx.createGain();

		this.colorOscHue.connect(this.colorGain);
		this.valueGain.connect(this.colorGain);
		this.colorOscSaturation.connect(this.colorGain);
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
		this.colorOscSaturation.start();
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

		// Choose frequencies that roughly correspond to hue, saturation, and value.
		const hueFrequency = (-Math.cos(hsv.x / 2)) * 220 + 440;
		const saturationFrequency = hsv.y * 440 + 220;
		const valueFrequency = (hsv.z + 0.1) * 440;

		// Sigmoid with maximum 0.25 * alpha.
		// Louder for greater value.
		const gain = 0.25 * Math.min(1, color.a) / (1 + Math.exp(-(hsv.z - 0.5) * 3));

		this.colorOscHue.frequency.setValueAtTime(hueFrequency, this.ctx.currentTime);
		this.colorOscSaturation.frequency.setValueAtTime(saturationFrequency, this.ctx.currentTime);
		this.colorOscValue.frequency.setValueAtTime(valueFrequency, this.ctx.currentTime);
		this.valueGain.gain.setValueAtTime((1 - hsv.z) * 0.4, this.ctx.currentTime);
		this.colorGain.gain.setValueAtTime(gain, this.ctx.currentTime);
	}

	public announceBoundaryCross(boundaryCrossCount: number) {
		this.boundaryGain.gain.cancelScheduledValues(this.ctx.currentTime);
		this.boundaryGain.gain.setValueAtTime(0, this.ctx.currentTime);
		this.boundaryGain.gain.linearRampToValueAtTime(0.018, this.ctx.currentTime + 0.1);
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
 * currently under the cursor. This tool adds a button that can be navigated to with the tab key
 * that enables/disables the tool.
 *
 * This allows the user to explore the content of the display without a working screen.
 */
export default class SoundUITool extends BaseTool {
	private soundFeedback: SoundFeedback|null = null;
	private toggleButton: HTMLElement;
	private toggleButtonContainer: HTMLElement;

	public constructor(
		private editor: Editor,
		description: string,
	) {
		super(editor.notifier, description);


		// Create a screen-reader-usable method of toggling the tool:
		this.toggleButtonContainer = document.createElement('div');
		this.toggleButtonContainer.classList.add('js-draw-sound-ui-toggle');

		this.toggleButton = document.createElement('button');
		this.toggleButton.onclick = () => {
			this.setEnabled(!this.isEnabled());
		};
		this.toggleButtonContainer.appendChild(this.toggleButton);
		this.updateToggleButtonText();

		editor.createHTMLOverlay(this.toggleButtonContainer);
	}

	public override canReceiveInputInReadOnlyEditor() {
		return true;
	}

	private updateToggleButtonText() {
		const containerEnabledClass = 'sound-ui-tool-enabled';
		if (this.isEnabled()) {
			this.toggleButton.innerText = this.editor.localization.disableAccessibilityExploreTool;
			this.toggleButtonContainer.classList.add(containerEnabledClass);
		} else {
			this.toggleButton.innerText = this.editor.localization.enableAccessibilityExploreTool;
			this.toggleButtonContainer.classList.remove(containerEnabledClass);
		}
	}

	public override setEnabled(enabled: boolean): void {
		super.setEnabled(enabled);

		if (!this.isEnabled()) {
			this.soundFeedback?.close();
			this.soundFeedback = null;
		} else {
			this.editor.announceForAccessibility(this.editor.localization.soundExplorerUsageAnnouncement);
		}

		this.updateToggleButtonText();
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		if (event.code === 'Escape') {
			this.setEnabled(false);
			return true;
		}

		return false;
	}

	private lastPointerPos: Point2;

	public override onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (!this.soundFeedback) {
			this.soundFeedback = new SoundFeedback();
		}

		// Allow two-finger gestures to move the screen.
		if (allPointers.length >= 2) {
			return false;
		}

		// Accept multiple cursors -- some screen readers require multiple (touch) pointers to interact with
		// an image instead of using the built-in navigation features.

		this.soundFeedback?.play();
		this.soundFeedback?.setColor(this.editor.display.getColorAt(current.screenPos) ?? Color4.black);
		this.lastPointerPos = current.canvasPos;
		return true;
	}

	public override onPointerMove({ current }: PointerEvt): void {
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

	public override onPointerUp(_event: PointerEvt): void {
		this.soundFeedback?.pause();
	}

	public override onGestureCancel(): void {
		this.soundFeedback?.pause();
	}
}
