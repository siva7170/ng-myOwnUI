import { Pipe, PipeTransform } from '@angular/core';
import { ToasterOptions } from './toaster.model';

@Pipe({ name: 'positionFilter', standalone: true })
export class PositionFilterPipe implements PipeTransform {
  transform(toasts: ToasterOptions[] | null, position: string): ToasterOptions[] {
    return (toasts || []).filter(t => t.position === position);
  }
}
