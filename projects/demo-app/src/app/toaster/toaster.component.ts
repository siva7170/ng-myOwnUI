import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToasterModule, ToasterOptions, ToasterService, ToasterType } from 'ng-my-own-ui';

@Component({
  selector: 'app-toaster',
  imports: [
      ToasterModule,
      FormsModule 
  ],
  templateUrl: './toaster.component.html',
  styleUrl: './toaster.component.scss'
})
export class ToasterComponent {
  header = 'Testing';
  body = 'Please enter some text to test!';
  type: ToasterType = 'info';
  position: 
    | 'top' | 'top-right' | 'right' | 'bottom-right' 
    | 'bottom' | 'bottom-left' | 'left' | 'top-left' | 'center'= 'top-right';
  presenceTimer = 5000;
  waitTimer = 100;
  trigger: 'auto' | 'manual' = 'auto';
  showAnim:"fade" | "slide" | "zoom" | "flip" | "none" | undefined = 'fade';
  hideAnim :"fade" | "slide" | "zoom" | "flip" | "none" | undefined= 'fade';
  freezeOnHover = true;
  autoClose = true;
  closeOnClick = false;

  private manualToaster: any;

  constructor(private toasterService: ToasterService) {}

  showToaster() {
    const options: ToasterOptions = {
      header: this.header,
      body: this.body,
      type: this.type,
      position: this.position,
      presenceTimer: this.presenceTimer,
      beforeWaitTimer: this.waitTimer,
      trigger: this.trigger,
      animateWhenShowAs: this.showAnim,
      animateWhenHideAs: this.hideAnim,
      hoverOnTimeFreeze: this.freezeOnHover,
      autoClose: this.autoClose,
      clickOnClose: this.closeOnClick
    };

    if (this.trigger === 'auto') {
      this.toasterService.show(options);
    } else {
      this.manualToaster = this.toasterService.createManual(options);
      this.manualToaster.show();
    }
  }

  hideToaster() {
    if (this.manualToaster) {
      this.manualToaster.close();
      this.manualToaster = undefined;
    }
  }

  
  //constructor(private toaster: ToasterService) {}

  showSuccess() {
    // this.toaster.show({
    //   type: 'success',
    //   header: 'Saved!',
    //   body: 'Your data has been saved successfully',
    //   position: 'top-right'
    // });
  }
}
