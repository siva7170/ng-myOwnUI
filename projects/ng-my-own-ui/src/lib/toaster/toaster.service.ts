import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToasterOptions } from './toaster.model';

export interface ManualToasterRef {
  id: string;
  show(): void;
  close(): void;
}

@Injectable({ providedIn: 'root' })
export class ToasterService {
  private toastsSubject = new BehaviorSubject<ToasterOptions[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private toastCounter = 0;
  private manualMap = new Map<string, { opts: ToasterOptions; shown: boolean }>();

  private normalizeOptions(opts: ToasterOptions): ToasterOptions {
    const id = opts.toasterId || `mOUIT_${++this.toastCounter}`;
    return {
      toasterId: id,
      type: opts.type || 'info',
      header: opts.header ?? 'Header',
      body: opts.body ?? '',
      autoClose: opts.autoClose ?? true,
      hoverOnTimeFreeze: opts.hoverOnTimeFreeze ?? true,
      beforeWaitTimer: opts.beforeWaitTimer ?? 100,
      presenceTimer: opts.presenceTimer ?? 5000,
      position: opts.position ?? 'top',
      clickOnClose: opts.clickOnClose ?? false,
      trigger: opts.trigger ?? 'manual',
      animateWhenShowAs: opts.animateWhenShowAs ?? 'fade',
      animateWhenHideAs: opts.animateWhenHideAs ?? 'fade'
    } as ToasterOptions;
  }

  /** Add and show immediately (auto/manual 'auto' flow) */
  show(toast: ToasterOptions) {
    const newToast = this.normalizeOptions(toast);
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, newToast]);
    // If this toast was created as a manual ref, mark it shown
    const manualEntry = this.manualMap.get(newToast.toasterId!);
    if (manualEntry) {
      manualEntry.shown = true;
      manualEntry.opts = newToast; // keep normalized copy
    }
  }

  /** Remove a toast by id */
  close(toasterId: string) {
    const current = this.toastsSubject.value.filter(t => t.toasterId !== toasterId);
    this.toastsSubject.next(current);
    // remove any manual tracking
    this.manualMap.delete(toasterId);
  }

  /** Remove all toasts */
  clear() {
    this.toastsSubject.next([]);
    this.manualMap.clear();
  }

  /**
   * Create a manual toaster reference.
   * It does NOT show the toast until you call ref.show().
   */
  createManual(options: ToasterOptions): ManualToasterRef {
    const normalized = this.normalizeOptions(options);
    // store in map as not yet shown
    this.manualMap.set(normalized.toasterId!, { opts: normalized, shown: false });

    const ref: ManualToasterRef = {
      id: normalized.toasterId!,
      show: () => {
        const entry = this.manualMap.get(normalized.toasterId!);
        if (!entry) return;
        if (entry.shown) return; // already shown
        const current = this.toastsSubject.value;
        this.toastsSubject.next([...current, entry.opts]);
        entry.shown = true;
      },
      close: () => {
        // reuse close method to remove from stream and delete mapping
        this.close(normalized.toasterId!);
      }
    };

    return ref;
  }
}



// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { ToasterOptions } from './toaster.model';

// @Injectable({ providedIn: 'root' })
// export class ToasterService {
//   private toastsSubject = new BehaviorSubject<ToasterOptions[]>([]);
//   toasts$ = this.toastsSubject.asObservable();

//   private toastCounter = 0;

//   show(toast: ToasterOptions) {
//     const id = toast.toasterId || `mOUIT_${++this.toastCounter}`;
//     const newToast = { 
//       ...toast,
//       toasterId: id,
//       type: toast.type || 'info',
//       autoClose: toast.autoClose ?? true,
//       hoverOnTimeFreeze: toast.hoverOnTimeFreeze ?? true,
//       beforeWaitTimer: toast.beforeWaitTimer ?? 100,
//       presenceTimer: toast.presenceTimer ?? 5000,
//       position: toast.position ?? 'top'
//     };
//     const current = this.toastsSubject.value;
//     this.toastsSubject.next([...current, newToast]);
//   }

//   close(toasterId: string) {
//     const current = this.toastsSubject.value.filter(t => t.toasterId !== toasterId);
//     this.toastsSubject.next(current);
//   }

//   clear() {
//     this.toastsSubject.next([]);
//   }
// }
