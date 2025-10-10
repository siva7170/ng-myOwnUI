import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ToasterOptions } from './toaster.model';
import { ToasterService } from './toaster.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mou-toaster-item',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="myOwnUI_Toaster" [ngClass]="'mOUIT_icon_' + options.type" (click)="onClick()">
    <div class="myOwnUI_Toaster_hdr">
      <span class="myOwnUI_ToasterIcon" [ngClass]="iconClass"></span>
      {{ options.header }}
    </div>
    <div class="myOwnUI_Toaster_by">{{ options.body }}</div>
    <span class="myOUIT_timerSec" [style.width.%]="progress"></span>
  </div>
  `
})
export class ToasterItemComponent implements OnInit, OnDestroy {
  @Input() options!: ToasterOptions;
  progress = 0;
  private intervalId?: any;
  private paused = false;

  constructor(private toasterService: ToasterService) {}

  get iconClass() {
    return {
      info_icon: this.options.type === 'info',
      warning_icon: this.options.type === 'warning',
      success_icon: this.options.type === 'success',
      failure_icon: this.options.type === 'failure',
      unknown_icon: this.options.type === 'unknown'
    };
  }

  ngOnInit() {
    setTimeout(() => this.startTimer(), this.options.beforeWaitTimer);
  }

  startTimer() {
    if (!this.options.autoClose) return;

    const total = this.options.presenceTimer!;
    const step = 1000 / 30;
    this.intervalId = setInterval(() => {
      if (!this.paused) {
        this.progress += (step / total) * 100;
        if (this.progress >= 100) {
          this.close();
        }
      }
    }, step);
  }

  @HostListener('mouseenter') onMouseEnter() {
    if (this.options.hoverOnTimeFreeze) this.paused = true;
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (this.options.hoverOnTimeFreeze) this.paused = false;
  }

  onClick() {
    if (this.options.clickOnClose) this.close();
  }

  close() {
    clearInterval(this.intervalId);
    this.toasterService.close(this.options.toasterId!);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
