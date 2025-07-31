import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'mou-button',
  imports:[CommonModule],
  template: ` <button
    [ngClass]="['mou-button', type, styleClass]"
    [disabled]="disabled"
    (click)="onClick()"
  >
    {{ label }}
  </button>`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ButtonComponent {
  @Input() label: string = 'Click';
  @Input() type: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled: boolean = false;
  @Input() styleClass: string = '';

  onClick() {
    console.log('Button clicked:', this.label);
  }
}
