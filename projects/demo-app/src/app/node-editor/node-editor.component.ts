import { Component } from '@angular/core';
import { NodeData, NodeEditorModule } from 'ng-my-own-ui';

@Component({
  selector: 'app-node-editor',
  imports: [NodeEditorModule],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.scss'
})
export class NodeEditorComponent {
  nodes: NodeData[] = [
    { id: 'input1', label: 'Input', header:'Input', type: 'input', subType:'table', position: { x: 50, y: 100 } },
    { id: 'input2', label: 'Input', header:'Input',type: 'input', subType:'table', position: { x: 50, y: 250 } },
    { id: 'proc1', label: 'Where', header:'Filter',type: 'process', subType:'filter', position: { x: 250, y: 150 } },
    { id: 'proc2', label: 'Group By', header:'Group',type: 'process', subType:'group', position: { x: 250, y: 150 } },
    { id: 'proc3', label: 'Having', header:'Having',type: 'process', subType:'having', position: { x: 250, y: 150 } },
    { id: 'proc4', label: 'Order By', header:'Order',type: 'process', subType:'order', position: { x: 250, y: 150 } },
    { id: 'proc5', label: 'Projection', header:'Projection',type: 'process', subType:'projection', position: { x: 250, y: 150 } },
    { id: 'output1', label: 'Output', header:'Output',type: 'output', subType:'final', position: { x: 500, y: 150 } },
  ];
}
