import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterComponent } from './toaster.component';
import { ToasterItemComponent } from './toaster-item.component';
import { ToasterService } from './toaster.service';

@NgModule({
  imports: [CommonModule,ToasterComponent, ToasterItemComponent],
  exports: [ToasterComponent, ToasterItemComponent]
})
export class ToasterModule {}