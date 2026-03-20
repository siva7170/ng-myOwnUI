import { Component } from '@angular/core';
import { NodeData, NodeEditorModule } from 'ng-my-own-ui';

@Component({
  selector: 'app-node-editor',
  imports: [NodeEditorModule],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.scss'
})
export class NodeEditorComponent {
  // FIX: all process nodes had identical position {x:250, y:150} — now staggered
  nodes: NodeData[] = [
    { id: 'input1',  label: 'Table A',     header: 'Input',      type: 'input',   subType: 'table',      position: { x: 40,  y: 60  } },
    { id: 'input2',  label: 'Table B',     header: 'Input',      type: 'input',   subType: 'table',      position: { x: 40,  y: 210 } },
    { id: 'proc1',   label: 'Where',       header: 'Filter',     type: 'process', subType: 'filter',     position: { x: 260, y: 60  } },
    { id: 'proc2',   label: 'Group By',    header: 'Group',      type: 'process', subType: 'group',      position: { x: 260, y: 185 } },
    { id: 'proc3',   label: 'Having',      header: 'Having',     type: 'process', subType: 'having',     position: { x: 260, y: 310 } },
    { id: 'proc4',   label: 'Order By',    header: 'Order',      type: 'process', subType: 'order',      position: { x: 470, y: 60  } },
    { id: 'proc5',   label: 'Projection',  header: 'Projection', type: 'process', subType: 'projection', position: { x: 470, y: 185 } },
    { id: 'output1', label: 'Result Set',  header: 'Output',     type: 'output',  subType: 'final',      position: { x: 680, y: 120 } },
  ];
}
