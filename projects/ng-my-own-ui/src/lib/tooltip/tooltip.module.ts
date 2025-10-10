import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipDirective } from './tooltip.directive';
import { TooltipComponent } from './tooltip.component';

@NgModule({
  imports: [CommonModule,TooltipComponent],
  exports: [TooltipComponent]
})
export class TooltipModule {}
