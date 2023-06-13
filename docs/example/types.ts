import { EventDispatcher } from '../../src/lib';

export type IconType = HTMLImageElement|SVGElement;


type AppNotifierMessageType = 'image-saved';
type AppNotifierMessageValueType = null;
export type AppNotifier = EventDispatcher<AppNotifierMessageType, AppNotifierMessageValueType>;