import { Component } from '@angular/core';
import { TooltipModule } from 'ng-my-own-ui'

@Component({
  selector: 'app-tooltip',
  imports: [
      TooltipModule
  ],
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  
}
