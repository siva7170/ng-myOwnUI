import { Directive, ElementRef, Input, HostListener, ComponentRef, ViewContainerRef } from '@angular/core';
import { TooltipComponent } from './tooltip.component';

@Directive({
  selector: '[mouTooltip]'
})
export class TooltipDirective {
  @Input('mouTooltip') text = '';
  @Input() position: 'top' | 'bottom' | 'left' | 'right' | 'auto' = 'auto';

  private tooltipRef?: ComponentRef<TooltipComponent>;

  constructor(
    private el: ElementRef,
    private vcr: ViewContainerRef
  ) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.tooltipRef) return;

    this.tooltipRef = this.vcr.createComponent(TooltipComponent);
    this.tooltipRef.instance.text = this.text;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipEl = this.tooltipRef.location.nativeElement;

    document.body.appendChild(tooltipEl);
    setTimeout(() => {
      requestAnimationFrame(() => {
        this.setTooltipPosition(hostRect, tooltipEl);
      });
      
    }, 0);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.destroyTooltip();
  }

  private destroyTooltip() {
    if (this.tooltipRef) {
      this.tooltipRef.destroy();
      this.tooltipRef = undefined;
    }
  }

  private setTooltipPosition(hostRect: DOMRect, tooltipEl: HTMLElement) {
    const spacing = 8;
    const tooltipRect = tooltipEl.getBoundingClientRect();

    let top = 0, left = 0, arrowDir: string = 'top';

    const preferred = this.position === 'auto' ? this.autoDetectPosition(hostRect, tooltipRect) : this.position;

    console.log('Preferred position:', preferred);

    switch (preferred) {
      case 'top':
        top = hostRect.top - tooltipRect.height - spacing;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        arrowDir = 'top';
        console.log('Top position:', { top, left }, 'HostRect:', hostRect, 'TooltipRect:', tooltipRect);
        break;
      case 'bottom':
        top = hostRect.bottom + spacing;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        arrowDir = 'bottom';
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - spacing;
        arrowDir = 'left';
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + spacing;
        arrowDir = 'right';
        console.log('Top position:', { top, left }, 'HostRect:', hostRect, 'TooltipRect:', tooltipRect);
        break;
    }

    tooltipEl.style.top = `${top + window.scrollY}px`;
    tooltipEl.style.left = `${left + window.scrollX}px`;
    tooltipEl.setAttribute('data-arrow', arrowDir);
  }

  private autoDetectPosition(host: DOMRect, tooltip: DOMRect): 'top' | 'bottom' | 'left' | 'right' {
    const spaceTop = host.top;
    const spaceBottom = window.innerHeight - host.bottom;
    const spaceLeft = host.left;
    const spaceRight = window.innerWidth - host.right;

    console.log('hostRect:', host);

    const max = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);

    if (max === spaceBottom) return 'bottom';
    if (max === spaceTop) return 'top';
    if (max === spaceRight) return 'right';
    return 'left';
  }

//   private autoDetectPosition(host: DOMRect, tooltip: DOMRect): 'top' | 'bottom' | 'left' | 'right' {
//   // Calculate available space relative to viewport
//   const spaceTop = host.top;
//   const spaceBottom = window.innerHeight - host.bottom;
//   const spaceLeft = host.left;
//   const spaceRight = window.innerWidth - host.right;

//   console.log('Viewport spaces — Top:', spaceTop, 'Bottom:', spaceBottom, 'Left:', spaceLeft, 'Right:', spaceRight);

//   // First, prefer positions that can actually fit the tooltip
//   const fitsTop = tooltip.height + 8 < spaceTop;
//   const fitsBottom = tooltip.height + 8 < spaceBottom;
//   const fitsLeft = tooltip.width + 8 < spaceLeft;
//   const fitsRight = tooltip.width + 8 < spaceRight;

//     console.log('Fits — Top:', fitsTop, 'Bottom:', fitsBottom, 'Left:', fitsLeft, 'Right:', fitsRight);

//   // Pick the first direction that fits (you can adjust priority order)
//   if (fitsTop) return 'top';
//   if (fitsBottom) return 'bottom';
//   if (fitsRight) return 'right';
//   if (fitsLeft) return 'left';

//   // If none fit, fallback to the largest available space
//   const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);

//   if (maxSpace === spaceBottom) return 'bottom';
//   if (maxSpace === spaceTop) return 'top';
//   if (maxSpace === spaceRight) return 'right';
//   return 'left';
// }

}
