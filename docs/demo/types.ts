import { EventDispatcher } from 'js-draw';

export type IconType = HTMLImageElement | SVGElement;

type AppNotifierMessageType = 'image-saved';
type AppNotifierMessageValueType = null;
export type AppNotifier = EventDispatcher<AppNotifierMessageType, AppNotifierMessageValueType>;
