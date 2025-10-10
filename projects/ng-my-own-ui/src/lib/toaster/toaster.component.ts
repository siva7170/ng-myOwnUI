import { Component } from '@angular/core';
import { ToasterService } from './toaster.service';
import { ToasterOptions } from './toaster.model';
import { CommonModule } from '@angular/common';
import { ToasterItemComponent } from './toaster-item.component';
import { PositionFilterPipe } from "./toaster-pipe";

@Component({
  selector: 'mou-toaster',
  standalone: true,
  imports: [CommonModule, ToasterItemComponent, PositionFilterPipe],
  template: `
    <ng-container *ngFor="let pos of positions">
      <div class="myOwnUI_Toaster_Panel" [ngClass]="'mOUITP_' + pos.replace('-','_')">
        <mou-toaster-item
          *ngFor="let toast of (toasterService.toasts$ | async) | positionFilter:pos"
          [options]="toast">
        </mou-toaster-item>
      </div>
    </ng-container>
  `,
 // styleUrls: ['./toaster.styles.css']
})
export class ToasterComponent {
  positions = [
    'top', 'top-right', 'right', 'bottom-right', 
    'bottom', 'bottom-left', 'left', 'top-left', 'center'
  ];

  constructor(public toasterService: ToasterService) {}
}
