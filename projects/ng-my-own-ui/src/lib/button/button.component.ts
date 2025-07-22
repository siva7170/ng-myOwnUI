import { Component, Input } from '@angular/core';

@Component({
  selector: 'mou-button',
  template: ` <button
    [ngClass]="['mou-button', type, styleClass]"
    [disabled]="disabled"
    (click)="onClick()"
  >
    {{ label }}
  </button>`,
  styleUrls: ['./button.component.scss'],
  standalone: false
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
