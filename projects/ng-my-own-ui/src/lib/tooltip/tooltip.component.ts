import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'mou-tooltip',
  templateUrl: './tooltip.component.html',
 // styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent {
  @Input() text = '';
  @HostBinding('class') hostClass = 'tooltip-box';
}
