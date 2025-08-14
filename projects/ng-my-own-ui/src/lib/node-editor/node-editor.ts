import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, Directive, ElementRef, EventEmitter, HostListener, Input, NgModule, Output, QueryList, Renderer2, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';

type NodeType = 'input' | 'process' | 'output';

export interface NodeData {
  id: string;
  label: string;
  header: string;
  type: NodeType;
  subType?: string;
  position: { x: number; y: number };
}

export interface Point { x: number; y: number; }

export interface Connection {
  from: { nodeId: string; anchor: 'left' | 'right' };
  to: { nodeId: string; anchor: 'left' | 'right' };
}

@Directive({
  selector: '[nodeTemplate]',
  standalone: true,
})
export class NodeTemplateDirective {
  @Input('nodeTemplate') type!: string;

  constructor(public template: TemplateRef<any>) { }
}

/*** Node-Block ***/

@Component({
  selector: 'node-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="node-block" [ngClass]="nodeClass"
         [style.left.px]="position.x"
         [style.top.px]="position.y"
         (mousedown)="onMouseDown($event)">
      <div class="node-header">{{ header }}</div>
      <div class="node-content">
        <ng-content></ng-content>
      </div>
     <div class="connector left"
     *ngIf="type !== 'input'"
     [attr.id]="'connector-' + id + '-left'"
     (mousedown)="startConnection($event, 'left')"></div>

<div class="connector right"
     *ngIf="type !== 'output'"
     [attr.id]="'connector-' + id + '-right'"
     (mousedown)="startConnection($event, 'right')"></div>
  
    </div>
  `,
  styles: [`
    .node-block {
      position: absolute;
      min-width: 150px;
      min-height: 80px;
      background: #ffffffff;
      border: 1px solid #9f9f9f;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 0;
    }
    .node-header {
      background: #e9e9e9;
      padding: 0.25rem 0.25rem;
      font-weight: 700;
      border-bottom: 1px solid #ccc;
      border-radius: 4px 4px 0 0;
      font-size: 0.8rem;
      text-align: center;
      cursor: move;
    }
    .node-content {
      padding: 8px;
    }
   .connector {
      width: 10px;
      height: 10px;
      position: relative;
      cursor: crosshair;
    }

    .left {
      left: 1px;
      border: 2px solid white;
      transform: rotate(45deg) translateY(-50%);
      
      background: #02b10bff;
      /*border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-right: 12px solid black;*/
    }

    .right {
      border: 2px solid white;
      transform: rotate(45deg) translateY(-50%);
      background: #007bff;
      /*border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-left: 12px solid black;*/
    }

    .left, .right {
      position: absolute;
      top: 50%;
    }

    .left {
      left: -8px;
    }

    .right {
      right: -1px;
    }

    .node-dragging{
      box-shadow: 0px 0px 5px 2px #00000096;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeComponent {
  @Input() id!: string;
  @Input() header = '';
  @Input() label = '';
  @Input() type: 'input' | 'process' | 'output' = 'process';
  @Input() subType?: string;
  @Input() position = { x: 0, y: 0 };
  @Output() startConnect = new EventEmitter<{ nodeId: string; anchor: 'left' | 'right'; point: { x: number; y: number } }>();
  @Output() completeConnect = new EventEmitter<'left' | 'right'>();

  nodeClass = '';

  private isDragging = false;
  private offset = { x: 0, y: 0 };

  constructor(private el: ElementRef, private cdr: ChangeDetectorRef) {
    this.nodeClass = `node-type-${this.type}`;
  }

  ngAfterContentInit(): void {
    this.nodeClass = `node-type-${this.type}`;
  }

  onMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('connector')) return;
    if (!(event.target as HTMLElement).classList.contains('node-header')) return;

    this.isDragging = true;
    this.offset = {
      x: event.offsetX,
      y: event.offsetY
    };
    ((event.target as HTMLElement).parentNode as HTMLElement).classList.add('node-dragging');
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;

    const container = (this.el.nativeElement as HTMLElement).parentElement;
    const containerRect = container?.getBoundingClientRect();

    this.position = {
      x: event.clientX - containerRect!.left - this.offset.x,
      y: event.clientY - containerRect!.top - this.offset.y
    };
    this.cdr.detectChanges();
  };

  onMouseUp = (event: MouseEvent) => {
    ((event.target as HTMLElement).parentNode as HTMLElement).classList.remove('node-dragging');
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  startConnection(event: MouseEvent, anchor: 'left' | 'right') {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const container = (this.el.nativeElement as HTMLElement).parentElement;
    const containerRect = container?.getBoundingClientRect();

    const point = {
      x: rect.left + rect.width / 2 - containerRect!.left,
      y: rect.top + rect.height / 2 - containerRect!.top
    };
    this.startConnect.emit({ nodeId: this.id, anchor, point });
  }

  @HostListener('mouseup', ['$event'])
  handleMouseUp(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('connector')) {
      const side = (event.target as HTMLElement).classList.contains('left') ? 'left' : 'right';
      this.completeConnect.emit(side);
    }
  }
}

/*** Node-Editor ***/

@Component({
  selector: 'node-editor',
  standalone: true,
  imports: [CommonModule, NodeComponent],
  template: `
    <div class="node-editor-container"  #editorContainer   
    (mousedown)="startPan($event)"
    (mousemove)="onPan($event)"
    (mouseup)="endPan()"
    (mouseleave)="endPan()">
     <div class="workspace" [style.transform]="getWorkspaceTransform()">
<svg class="connection-lines">
          <!-- existing connections -->
            <path *ngFor="let conn of connections"
                  [attr.d]="getBezierPath(getAnchorPosition(conn.from), getAnchorPosition(conn.to))"
                  stroke="black" 
                  fill="none" 
                  stroke-width="3" 
                  style="cursor: pointer;"
                  pointer-events="stroke"
                  (contextmenu)="onConnectionRightClick($event, conn)"/>

            <!-- temporary dragging connection -->
            <path *ngIf="tempLine"
                  [attr.d]="getBezierPath(tempLine.start, tempLine.end)"
                  stroke="gray" stroke-dasharray="4" fill="transparent" stroke-width="2"/>
        <!-- <line *ngFor="let conn of connections"
              [attr.x1]="getAnchorPosition(conn.from)?.x"
              [attr.y1]="getAnchorPosition(conn.from)?.y"
              [attr.x2]="getAnchorPosition(conn.to)?.x"
              [attr.y2]="getAnchorPosition(conn.to)?.y"
              stroke="black" stroke-width="2"/>

        <line *ngIf="tempLine"
              [attr.x1]="tempLine.start.x"
              [attr.y1]="tempLine.start.y"
              [attr.x2]="tempLine.end.x"
              [attr.y2]="tempLine.end.y"
              stroke="gray" stroke-dasharray="4" stroke-width="2"/> -->
      </svg>
      <div *ngIf="contextMenu.visible"
        class="context-menu"
        [style.left.px]="contextMenu.x"
        [style.top.px]="contextMenu.y">
        <button (click)="deleteTarget()">Delete</button>
      </div>
       <node-block
        *ngFor="let node of nodes"
        [id]="node.id"
        [type]="node.type"
        [header]="node.header"
        [position]="node.position"
        (startConnect)="beginConnection($event)"
        (completeConnect)="completeConnection(node.id, $event)"
        (contextmenu)="onNodeRightClick($event, node.id)"
        >
          <ng-container *ngIf="getNodeTemplate(node.type, node.subType) as tmpl"
                [ngTemplateOutlet]="tmpl"
                [ngTemplateOutletContext]="{ label: node.label, header: node.header, type: node.type, subType: node.subType }">
        </ng-container>
      </node-block>
     </div>
         
      <button class="add-node-btn" (click)="addNode('process')">+ Add Node</button>
    </div>
  `,
  styles: [`
  .connection-lines{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Prevents interference with node dragging */
     z-index: 0;
  }
  .add-node-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeEditorComponent {
  @ViewChild('editorContainer') containerRef!: ElementRef;

  @Input() containerHeight = 300;

  @Input() nodes: NodeData[] = [];

  // nodes: NodeData[] = [
  //   { id: '1', label: 'Input Node', type: 'input', position: { x: 50, y: 100 } },
  //   { id: '2', label: 'Output Node', type: 'output', position: { x: 300, y: 100 } },
  // ];

  connections: Connection[] = [];
  tempLine: { start: Point; end: Point } | null = null;
  connectionStart: { nodeId: string; anchor: 'left' | 'right'; point: Point } | null = null;

  @ContentChildren(NodeTemplateDirective)
  templates!: QueryList<NodeTemplateDirective>;

  private templateMap = new Map<string, TemplateRef<any>>();

  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    target: null as
      | { type: 'node'; nodeId: string }
      | { type: 'connection'; from: { nodeId: string; anchor: 'left' | 'right' }, to: { nodeId: string; anchor: 'left' | 'right' } }
      | null
  };

  workspaceOffset = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  private initialOffset = { x: 0, y: 0 };
  private isPanning = false;

  @HostListener('document:click')
  hideContextMenu() {
    this.contextMenu.visible = false;
  }

  constructor(private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) { }

  ngAfterContentInit(): void {
    for (const tpl of this.templates) {
      this.templateMap.set(tpl.type, tpl.template);
    }
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.containerRef.nativeElement, 'height', this.containerHeight + 'px');
  }

  getNodeTemplate(type: string, subType?: string): TemplateRef<any> | null {
    const fullKey = subType ? `${type}:${subType}` : type;
    return this.templateMap.get(fullKey) || null;
  }

  addNode(type: NodeData['type'], header: string = 'Header') {
    const id = Math.random().toString(36).substring(2);
    const label = `${type.charAt(0).toUpperCase() + type.slice(1)} Node`;
    const position = { x: 150 + this.nodes.length * 100, y: 150 };
    this.nodes.push({ id, label, type, position, header: header });
    this.cdr.markForCheck();
    this.cdr.markForCheck();
  }

  getAnchorPosition(ref: { nodeId: string; anchor: 'left' | 'right' }): Point | null {
    const el = document.getElementById(`connector-${ref.nodeId}-${ref.anchor}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top
    };
  }

  getBezierPath(start: { x: number; y: number } | null, end: { x: number; y: number } | null): string {
    if (!start || !end) return '';

    const dx = Math.abs(end.x - start.x) * 0.5;
    const controlPoint1 = { x: start.x + dx, y: start.y };
    const controlPoint2 = { x: end.x - dx, y: end.y };

    return `M ${start.x},${start.y} C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${end.x},${end.y}`;
  }

  beginConnection(evt: { nodeId: string; anchor: 'left' | 'right'; point: Point }) {
    this.connectionStart = evt;
    this.tempLine = {
      start: evt.point,
      end: evt.point
    };
    console.log('beginConnection', this.tempLine);
    this.cdr.markForCheck();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.tempLine) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      this.tempLine.end = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      this.cdr.markForCheck();
    }
  }

  // @HostListener('document:mousemove', ['$event'])
  // onMouseMove(event: MouseEvent) {
  //   if (this.tempLine) {
  //     this.tempLine.end = { x: event.clientX, y: event.clientY };
  //     this.cdr.markForCheck();
  //   }
  // }

  // onMouseMove(event: MouseEvent) {
  //   if (this.tempLine) {
  //     const rect = this.containerRef.nativeElement.getBoundingClientRect();
  //     this.tempLine.end = {
  //       x: event.clientX - rect.left,
  //       y: event.clientY - rect.top
  //     };
  //     this.cdr.markForCheck();
  //   }
  // }

  onMouseUp() {
    this.tempLine = null;
    this.connectionStart = null;
    this.cdr.markForCheck();
  }

  completeConnection(toNodeId: string, anchor: 'left' | 'right') {
    if (this.connectionStart && this.connectionStart.nodeId !== toNodeId) {
      this.connections.push({
        from: { nodeId: this.connectionStart.nodeId, anchor: this.connectionStart.anchor },
        to: { nodeId: toNodeId, anchor }
      });
    }
    this.tempLine = null;
    this.connectionStart = null;
    this.cdr.markForCheck();
  }

  onNodeRightClick(event: MouseEvent, nodeId: string) {
    event.preventDefault();
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      target: { type: 'node', nodeId }
    };
  }

  onConnectionRightClick(event: MouseEvent, conn: any) {
    event.preventDefault();
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      target: { type: 'connection', from: conn.from, to: conn.to }
    };
  }

  deleteTarget() {
    if (!this.contextMenu.target) return;

    if (this.contextMenu.target.type === 'node') {
      if (this.contextMenu.target.type === 'node') {
        const nodeId = this.contextMenu.target.nodeId;
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.connections = this.connections.filter(
          c => c.from.nodeId !== nodeId &&
            c.to.nodeId !== nodeId
        );
      }
    }
    else if (this.contextMenu.target.type === 'connection') {
      const target = this.contextMenu.target;
      this.connections = this.connections.filter(
        c =>
          !(c.from.nodeId === target.from.nodeId &&
            c.from.anchor === target.from.anchor &&
            c.to.nodeId === target.to.nodeId &&
            c.to.anchor === target.to.anchor)
      );
    }

    this.contextMenu.visible = false;
  }

  startPan(event: MouseEvent) {
    const target = event.target as HTMLElement;
    console.log('startPan', target);
    // Prevent panning when clicking nodes or connections
    if (target.closest('.node-block') || target.closest('.connection-path')) {
      return;
    }

    this.isPanning = true;
    this.panStart = { x: event.clientX, y: event.clientY };
    this.initialOffset = { ...this.workspaceOffset };
  }

  onPan(event: MouseEvent) {
    if (!this.isPanning) return;

    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;

    this.workspaceOffset = {
      x: this.initialOffset.x + dx,
      y: this.initialOffset.y + dy
    };
  }

  endPan() {
    this.isPanning = false;
  }

  getWorkspaceTransform() {
    return `translate(${this.workspaceOffset.x}px, ${this.workspaceOffset.y}px)`;
  }
}

@NgModule({
  imports: [
    CommonModule,
    NodeTemplateDirective,
    NodeEditorComponent
  ],
  exports: [
    NodeTemplateDirective,
    NodeEditorComponent,
  ]
})
export class NodeEditorModule { }