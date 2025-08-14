import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule, NodeEditorModule } from 'ng-my-own-ui';
import { ButtonComponent } from './button/button.component';
import { NodeEditorComponent } from './node-editor/node-editor.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    ButtonComponent,
    NodeEditorComponent,
    CommonModule,
    ButtonModule,
    NodeEditorModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'demo-app';
  activeMenu = 'button';

  onMenuClick(menu: string) {
    this.activeMenu = menu;
  }
}
