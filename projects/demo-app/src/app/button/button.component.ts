import { Component } from '@angular/core';
import { ButtonModule } from 'ng-my-own-ui';

@Component({
  selector: 'app-button',
  imports: [
      ButtonModule,
  ],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {

}
