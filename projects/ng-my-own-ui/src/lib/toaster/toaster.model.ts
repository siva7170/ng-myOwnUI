export type ToasterType = 'info' | 'success' | 'failure' | 'warning' | 'unknown';

export interface ToasterOptions {
  toasterId?: string;
  type?: ToasterType;
  header?: string;
  body?: string;
  autoClose?: boolean;
  hoverOnTimeFreeze?: boolean;
  beforeWaitTimer?: number;
  presenceTimer?: number;
  position?: 
    | 'top' | 'top-right' | 'right' | 'bottom-right' 
    | 'bottom' | 'bottom-left' | 'left' | 'top-left' | 'center';
  clickOnClose?: boolean;
  trigger?: 'auto' | 'manual';
  animateWhenShowAs?: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
  animateWhenHideAs?: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
}
