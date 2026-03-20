import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren,
  Directive, ElementRef, EventEmitter, HostListener, Input, NgModule,
  OnDestroy, OnInit, Output, QueryList, Renderer2, TemplateRef,
  ViewChild, ViewEncapsulation
} from '@angular/core';

// ─────────────────────────────────────────────────────────────────────────────
// Field system — public types consumed by host app
// ─────────────────────────────────────────────────────────────────────────────

export type NodeFieldType = 'text' | 'radio' | 'checkbox' | 'slider' | 'dropdown';

export interface NodeFieldDef {
  /** Unique key within the node. Used to reference this field's value upstream. */
  key: string;
  type: NodeFieldType;
  label: string;
  /** Current raw value. Mutated in-place when the user changes the field. */
  value: any;
  /** For radio / dropdown: list of choices */
  options?: string[];
  /** For slider: min / max / step */
  min?: number;
  max?: number;
  step?: number;
  /**
   * Optional transform applied before this field's value is exposed downstream.
   * Defined in the host component (demo-app) and passed in via NodeData.fields.
   * Signature:  (rawValue: any, upstreamValues: Record<string,any>) => any
   *
   * - rawValue        : the current raw value of this specific field
   * - upstreamValues  : already-resolved flat map of ALL upstream field values
   *                     so a transform can read other fields to compute its output
   */
  transform?: (rawValue: any, upstreamValues: Record<string, any>) => any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core structural types
// ─────────────────────────────────────────────────────────────────────────────

export type NodeType = 'input' | 'process' | 'output';

export interface NodeData {
  id: string;
  label: string;
  header: string;
  type: NodeType;
  subType?: string;
  position: { x: number; y: number };
  /** Field definitions including current values and optional transforms */
  fields?: NodeFieldDef[];
}

export interface Point { x: number; y: number; }

export interface Connection {
  from: { nodeId: string; anchor: 'left' | 'right' };
  to:   { nodeId: string; anchor: 'left' | 'right' };
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeTemplateDirective
// ─────────────────────────────────────────────────────────────────────────────

@Directive({ selector: '[nodeTemplate]', standalone: true })
export class NodeTemplateDirective {
  @Input('nodeTemplate') type!: string;
  constructor(public template: TemplateRef<any>) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeFieldsComponent — renders the fields[] array inside a node-block
// Standalone so it can be imported cleanly into NodeComponent
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'node-fields',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nf-wrapper" *ngIf="fields && fields.length">
      <div class="nf-row" *ngFor="let f of fields">
        <label class="nf-label">{{ f.label }}</label>

        <!-- text -->
        <input *ngIf="f.type === 'text'"
               class="nf-input nf-text"
               type="text"
               [(ngModel)]="f.value"
               (ngModelChange)="onFieldChange()"
               (mousedown)="$event.stopPropagation()"
               (click)="$event.stopPropagation()"/>

        <!-- dropdown -->
        <select *ngIf="f.type === 'dropdown'"
                class="nf-input nf-select"
                [(ngModel)]="f.value"
                (ngModelChange)="onFieldChange()"
                (mousedown)="$event.stopPropagation()"
                (click)="$event.stopPropagation()">
          <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
        </select>

        <!-- checkbox -->
        <label *ngIf="f.type === 'checkbox'" class="nf-checkbox-wrap"
               (mousedown)="$event.stopPropagation()"
               (click)="$event.stopPropagation()">
          <input type="checkbox"
                 [(ngModel)]="f.value"
                 (ngModelChange)="onFieldChange()"/>
          <span class="nf-checkbox-box" [class.checked]="f.value"></span>
        </label>

        <!-- radio -->
        <div *ngIf="f.type === 'radio'" class="nf-radio-group"
             (mousedown)="$event.stopPropagation()"
             (click)="$event.stopPropagation()">
          <label *ngFor="let opt of f.options" class="nf-radio-opt">
            <input type="radio"
                   [name]="'radio-' + f.key + '-' + instanceId"
                   [value]="opt"
                   [(ngModel)]="f.value"
                   (ngModelChange)="onFieldChange()"/>
            {{ opt }}
          </label>
        </div>

        <!-- slider -->
        <div *ngIf="f.type === 'slider'" class="nf-slider-wrap"
             (mousedown)="$event.stopPropagation()"
             (click)="$event.stopPropagation()">
          <input type="range"
                 class="nf-slider"
                 [min]="f.min ?? 0"
                 [max]="f.max ?? 100"
                 [step]="f.step ?? 1"
                 [(ngModel)]="f.value"
                 (ngModelChange)="onFieldChange()"/>
          <span class="nf-slider-val">{{ f.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf-wrapper {
      border-top: 1px solid #eee;
      padding: 6px 8px 4px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 170px;
    }
    .nf-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
    }
    .nf-label {
      flex: 0 0 60px;
      color: #555;
      font-size: 0.72rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nf-input {
      flex: 1;
      font-size: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 3px;
      padding: 2px 4px;
      outline: none;
      background: #fafafa;
      min-width: 0;
    }
    .nf-input:focus { border-color: #007bff; background: #fff; }
    .nf-select { cursor: pointer; }

    /* checkbox */
    .nf-checkbox-wrap {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .nf-checkbox-wrap input[type=checkbox] { display: none; }
    .nf-checkbox-box {
      width: 14px; height: 14px;
      border: 1.5px solid #bbb;
      border-radius: 3px;
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }
    .nf-checkbox-box.checked {
      background: #007bff;
      border-color: #007bff;
    }
    .nf-checkbox-box.checked::after {
      content: '';
      width: 4px; height: 7px;
      border: 2px solid #fff;
      border-top: none; border-left: none;
      transform: rotate(40deg) translateY(-1px);
      display: block;
    }

    /* radio */
    .nf-radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .nf-radio-opt {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.72rem;
      cursor: pointer;
      white-space: nowrap;
    }

    /* slider */
    .nf-slider-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }
    .nf-slider {
      flex: 1;
      height: 3px;
      cursor: pointer;
      accent-color: #007bff;
      min-width: 0;
    }
    .nf-slider-val {
      font-size: 0.7rem;
      color: #666;
      min-width: 24px;
      text-align: right;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeFieldsComponent {
  @Input() fields: NodeFieldDef[] = [];
  @Output() fieldChange = new EventEmitter<void>();

  /** Unique suffix to avoid radio name collisions when multiple nodes share a key */
  instanceId = Math.random().toString(36).substring(2, 7);

  onFieldChange() {
    this.fieldChange.emit();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeComponent  (node-block)
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'node-block',
  standalone: true,
  imports: [CommonModule, NodeFieldsComponent],
  template: `
    <div class="node-block"
         [class.node-selected]="selected"
         [ngClass]="nodeClass"
         [style.left.px]="position.x"
         [style.top.px]="position.y"
         (mousedown)="onMouseDown($event)">

      <div class="node-header">{{ header }}</div>

      <!-- Fields rendered by NodeFieldsComponent above custom template content -->
      <node-fields
        *ngIf="fields && fields.length"
        [fields]="fields"
        (fieldChange)="onFieldChanged()">
      </node-fields>

      <div class="node-content"><ng-content></ng-content></div>

      <div class="connector left"
           *ngIf="type !== 'input'"
           [attr.id]="'connector-' + id + '-left'"
           (mousedown)="startConnection($event, 'left')">
      </div>

      <div class="connector right"
           *ngIf="type !== 'output'"
           [attr.id]="'connector-' + id + '-right'"
           (mousedown)="startConnection($event, 'right')">
      </div>
    </div>
  `,
  styles: [`
    .node-block {
      position: absolute;
      min-width: 200px;
      background: #ffffff;
      border: 1px solid #9f9f9f;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 0;
      box-sizing: border-box;
      z-index: 1;
    }
    .node-block.node-type-input   { border-top: 3px solid #28a745; }
    .node-block.node-type-output  { border-top: 3px solid #dc3545; }
    .node-block.node-type-process { border-top: 3px solid #007bff; }

    .node-block.node-selected {
      outline: 2px solid #007bff;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
    }
    .node-header {
      background: #e9e9e9;
      padding: 0.25rem 0.5rem;
      font-weight: 700;
      border-bottom: 1px solid #ccc;
      border-radius: 4px 4px 0 0;
      font-size: 0.8rem;
      text-align: center;
      cursor: move;
      user-select: none;
    }
    .node-content { padding: 8px; }
    .connector {
      width: 12px; height: 12px;
      position: absolute;
      top: 50%;
      cursor: crosshair;
      border-radius: 50%;
      border: 2px solid #fff;
      box-sizing: border-box;
      z-index: 2;
      transition: transform 0.1s;
    }
    .connector.left  { left: -7px;  transform: translateY(-50%); background: #28a745; }
    .connector.right { right: -7px; transform: translateY(-50%); background: #007bff; }
    .connector.left:hover  { transform: translateY(-50%) scale(1.35); }
    .connector.right:hover { transform: translateY(-50%) scale(1.35); }
    .node-dragging { box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeComponent implements OnInit, OnDestroy {
  @Input() id!: string;
  @Input() header = '';
  @Input() label = '';
  @Input() type: NodeType = 'process';
  @Input() subType?: string;
  @Input() position = { x: 0, y: 0 };
  @Input() selected = false;
  @Input() fields: NodeFieldDef[] = [];

  @Output() startConnect    = new EventEmitter<{ nodeId: string; anchor: 'left' | 'right'; point: Point }>();
  @Output() completeConnect = new EventEmitter<'left' | 'right'>();
  @Output() positionChange  = new EventEmitter<{ nodeId: string; position: Point }>();
  @Output() nodeClick       = new EventEmitter<string>();
  /** Emitted whenever any field value changes — lets the editor recompute upstream values */
  @Output() fieldChange     = new EventEmitter<string>();

  nodeClass = '';
  private isDragging = false;
  private offset = { x: 0, y: 0 };

  constructor(private el: ElementRef, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.nodeClass = `node-type-${this.type}`;
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);
  }

  onFieldChanged() {
    this.fieldChange.emit(this.id);
  }

  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('connector')) { event.stopPropagation(); return; }
    if (!target.classList.contains('node-header')) return;

    event.stopPropagation();
    this.isDragging = true;
    this.offset = { x: event.offsetX, y: event.offsetY };

    const nodeEl = target.closest('.node-block') as HTMLElement;
    nodeEl?.classList.add('node-dragging');
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup',   this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;
    const workspace = (this.el.nativeElement as HTMLElement).parentElement;
    const rect = workspace?.getBoundingClientRect();
    if (!rect) return;

    const scaleStr = workspace?.style.transform ?? '';
    const scaleMatch = scaleStr.match(/scale\(([^)]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    this.position = {
      x: (event.clientX - rect.left) / scale - this.offset.x / scale,
      y: (event.clientY - rect.top)  / scale - this.offset.y / scale,
    };
    this.positionChange.emit({ nodeId: this.id, position: { ...this.position } });
    this.cdr.detectChanges();
  };

  onMouseUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    const nodeEl = (this.el.nativeElement as HTMLElement).querySelector('.node-block');
    nodeEl?.classList.remove('node-dragging');
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);
  };

  startConnection(event: MouseEvent, anchor: 'left' | 'right') {
    event.stopPropagation();
    const connectorEl = event.target as HTMLElement;
    const rect = connectorEl.getBoundingClientRect();
    const workspace = (this.el.nativeElement as HTMLElement).parentElement;
    const wsRect = workspace?.getBoundingClientRect();
    if (!wsRect) return;

    const scaleStr = workspace?.style.transform ?? '';
    const scaleMatch = scaleStr.match(/scale\(([^)]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    const point: Point = {
      x: (rect.left + rect.width  / 2 - wsRect.left) / scale,
      y: (rect.top  + rect.height / 2 - wsRect.top)  / scale,
    };
    this.startConnect.emit({ nodeId: this.id, anchor, point });
  }

  @HostListener('mouseup', ['$event'])
  handleMouseUp(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('connector')) {
      const side = target.classList.contains('left') ? 'left' : 'right';
      this.completeConnect.emit(side);
    } else {
      this.nodeClick.emit(this.id);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeEditorComponent  (node-editor)
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'node-editor',
  standalone: true,
  imports: [CommonModule, NodeComponent],
  template: `
    <div class="node-editor-container"
         #editorContainer
         [class.is-panning]="isPanning"
         [style.background-size]="getGridBackgroundSize()"
         [style.background-position]="getGridBackgroundPosition()"
         (mousedown)="startPan($event)"
         (mousemove)="onEditorMouseMove($event)"
         (mouseup)="onEditorMouseUp($event)"
         (mouseleave)="endPan()"
         (wheel)="onWheel($event)"
         (click)="onEditorClick($event)">

      <div class="workspace"
           #editorWorkspace
           [style.transform]="getWorkspaceTransform()"
           [style.width.px]="getWorkspaceSize().width"
           [style.height.px]="getWorkspaceSize().height">

        <svg class="connection-lines"
             [attr.width]="getWorkspaceSize().width"
             [attr.height]="getWorkspaceSize().height"
             style="overflow:visible">
          <defs>
            <marker id="conn-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke"
                    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </marker>
          </defs>

          <g *ngFor="let conn of connections">
            <path [attr.d]="getConnectionPath(conn)"
                  [attr.stroke]="conn === selectedConnection ? '#007bff' : '#555'"
                  [attr.stroke-width]="conn === selectedConnection ? 3 : 2.5"
                  fill="none"
                  stroke-linecap="round"
                  style="cursor:pointer"
                  pointer-events="stroke"
                  marker-end="url(#conn-arrow)"
                  (contextmenu)="onConnectionRightClick($event, conn)"
                  (click)="onConnectionClick($event, conn)"/>
          </g>

          <path *ngIf="tempLine"
                [attr.d]="getTempLinePath()"
                stroke="#888"
                stroke-dasharray="6 3"
                fill="none"
                stroke-width="2"
                stroke-linecap="round"/>
        </svg>

        <node-block
          *ngFor="let node of nodes; trackBy: trackById"
          [id]="node.id"
          [type]="node.type"
          [header]="node.header"
          [position]="node.position"
          [selected]="selectedNodeId === node.id"
          [fields]="node.fields || []"
          (startConnect)="beginConnection($event)"
          (completeConnect)="completeConnection(node.id, $event)"
          (positionChange)="onNodePositionChange($event)"
          (nodeClick)="onNodeClick($event)"
          (fieldChange)="onFieldChange()"
          (contextmenu)="onNodeRightClick($event, node.id)">

          <ng-container *ngIf="getNodeTemplate(node.type, node.subType) as tmpl"
                        [ngTemplateOutlet]="tmpl"
                        [ngTemplateOutletContext]="{
                          label: node.label,
                          header: node.header,
                          type: node.type,
                          subType: node.subType,
                          upstreamValues: getUpstreamValues(node.id)
                        }">
          </ng-container>
        </node-block>
      </div>

      <!-- Context menu — inside container, outside workspace -->
      <div *ngIf="contextMenu.visible"
           class="context-menu"
           [style.left.px]="contextMenu.x"
           [style.top.px]="contextMenu.y">
        <button (click)="deleteTarget(); $event.stopPropagation()">🗑 Delete</button>
      </div>

      <!-- Toolbar -->
      <div class="editor-toolbar">
        <button class="toolbar-btn btn-process" (click)="addNode('process')">+ Process</button>
        <button class="toolbar-btn btn-input"   (click)="addNode('input')">+ Input</button>
        <button class="toolbar-btn btn-output"  (click)="addNode('output')">+ Output</button>
        <div class="toolbar-sep"></div>
        <span class="zoom-label">{{ (scale * 100) | number:'1.0-0' }}%</span>
        <button class="toolbar-btn" (click)="zoomIn()">＋</button>
        <button class="toolbar-btn" (click)="zoomOut()">－</button>
        <button class="toolbar-btn" (click)="resetView()">↺</button>
      </div>

      <!-- Hint bar -->
      <div class="editor-hint">
        Drag header to move · Right-click to delete · Scroll to zoom · ESC to cancel · DEL to delete selected
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .node-editor-container {
      width: 100%; height: 100%;
      background-color: #f5f5f5;
      background-image:
        linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
      border: 1px solid #ccc;
      position: relative;
      user-select: none;
      overflow: hidden;
      cursor: grab;
      outline: none;
      box-sizing: border-box;
    }
    .node-editor-container.is-panning { cursor: grabbing; }
    .workspace { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    .connection-lines {
      position: absolute; top: 0; left: 0;
      pointer-events: none; z-index: 0; overflow: visible;
    }
    .context-menu {
      position: absolute; background: #fff;
      border: 1px solid #ddd; border-radius: 5px;
      z-index: 9999; padding: 4px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15); min-width: 110px;
    }
    .context-menu button {
      background: none; border: none; padding: 6px 12px;
      width: 100%; text-align: left; cursor: pointer;
      font-size: 0.82rem; border-radius: 3px;
    }
    .context-menu button:hover { background: #f5f5f5; }
    .editor-toolbar {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      display: flex; gap: 5px; align-items: center;
      background: rgba(255,255,255,0.92); border: 1px solid #ddd;
      border-radius: 6px; padding: 5px 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .toolbar-btn {
      background: #fff; border: 1px solid #ccc; border-radius: 4px;
      padding: 3px 9px; font-size: 0.78rem; cursor: pointer;
      white-space: nowrap; line-height: 1.6;
    }
    .toolbar-btn:hover  { background: #f0f0f0; }
    .toolbar-btn:active { transform: translateY(1px); }
    .btn-process { border-color: #007bff; color: #007bff; }
    .btn-input   { border-color: #28a745; color: #28a745; }
    .btn-output  { border-color: #dc3545; color: #dc3545; }
    .toolbar-sep { width: 1px; height: 18px; background: #ddd; margin: 0 2px; }
    .zoom-label  { font-size: 0.75rem; color: #666; min-width: 34px; text-align: center; }
    .editor-hint {
      position: absolute; bottom: 8px; left: 50%;
      transform: translateX(-50%); font-size: 0.7rem; color: #999;
      background: rgba(255,255,255,0.7); padding: 2px 10px;
      border-radius: 10px; pointer-events: none; white-space: nowrap;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorContainer') containerRef!: ElementRef;
  @ViewChild('editorWorkspace') workspaceRef!: ElementRef;

  @Input() containerHeight = 400;
  @Input() nodes: NodeData[] = [];

  connections: Connection[] = [];
  tempLine: { start: Point; end: Point } | null = null;
  private connectionStart: { nodeId: string; anchor: 'left' | 'right'; point: Point } | null = null;

  @ContentChildren(NodeTemplateDirective) templates!: QueryList<NodeTemplateDirective>;
  private templateMap = new Map<string, TemplateRef<any>>();

  contextMenu: {
    visible: boolean; x: number; y: number;
    target: { type: 'node'; nodeId: string }
           | { type: 'connection'; from: Connection['from']; to: Connection['to'] }
           | null;
  } = { visible: false, x: 0, y: 0, target: null };

  selectedNodeId: string | null = null;
  selectedConnection: Connection | null = null;

  workspaceOffset = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  private initialOffset = { x: 0, y: 0 };
  isPanning = false;

  scale = 1;
  private readonly MIN_SCALE = 0.2;
  private readonly MAX_SCALE = 3;

  workspaceBounds = { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 };
  editorWidth = 0;
  editorHeight = 0;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  ngAfterContentInit() {
    for (const tpl of this.templates) {
      this.templateMap.set(tpl.type, tpl.template);
    }
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.containerRef.nativeElement, 'height', this.containerHeight + 'px');
    this.renderer.setAttribute(this.containerRef.nativeElement, 'tabindex', '0');
    this.editorWidth  = this.containerRef.nativeElement.clientWidth;
    this.editorHeight = this.containerRef.nativeElement.clientHeight;
  }

  ngOnDestroy() {}

  // ── Data-flow: upstream value resolution ─────────────────────────────────
  //
  // Walk the connection graph backwards from nodeId, collect all ancestor nodes
  // in topological order (closest ancestors first), then for each ancestor
  // run each field through its transform(rawValue, alreadyResolvedMap) and
  // accumulate into a flat map keyed as  "nodeId.fieldKey".
  //
  // The flat map is also available with short keys (just fieldKey) — the last
  // ancestor that defines a given key wins, so closer ancestors override
  // further ones. Both forms are available so templates can use either:
  //   let-uv="upstreamValues"
  //   uv['input1.tableName']   ← fully qualified (never ambiguous)
  //   uv['tableName']          ← short key (convenient, may be overwritten)

  getUpstreamValues(nodeId: string): Record<string, any> {
    const ancestors = this.getAncestorsInOrder(nodeId);
    const result: Record<string, any> = {};

    for (const ancestor of ancestors) {
      const node = this.nodes.find(n => n.id === ancestor);
      if (!node?.fields?.length) continue;

      for (const field of node.fields) {
        const transformedValue = field.transform
          ? field.transform(field.value, result)   // pass already-resolved map so transforms can read each other
          : field.value;

        // Fully qualified key — never collides
        result[`${node.id}.${field.key}`] = transformedValue;
        // Short key — later (closer) ancestor overwrites earlier one
        result[field.key] = transformedValue;
      }
    }

    return result;
  }

  /**
   * Returns ancestor node IDs in breadth-first order starting from immediate
   * parents, so direct parents' fields take precedence over grandparents' in
   * the short-key map.
   */
  private getAncestorsInOrder(nodeId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [nodeId];
    const order: string[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      // Find all nodes that connect INTO current
      const parents = this.connections
        .filter(c => c.to.nodeId === current)
        .map(c => c.from.nodeId);

      for (const p of parents) {
        if (!visited.has(p)) {
          visited.add(p);
          order.push(p);
          queue.push(p);
        }
      }
    }

    // Reverse so furthest ancestors come first; direct parents come last
    // (so direct parents' short keys overwrite grandparents')
    return order.reverse();
  }

  // Called whenever any field value changes — forces re-evaluation of
  // downstream nodes' upstreamValues in the template
  onFieldChange() {
    this.cdr.markForCheck();
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape') {
      if (this.tempLine) { this.tempLine = null; this.connectionStart = null; }
      this.selectedNodeId = null;
      this.selectedConnection = null;
      this.contextMenu.visible = false;
      this.cdr.markForCheck();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedNodeId) {
        this.deleteNodeById(this.selectedNodeId);
        this.selectedNodeId = null;
      } else if (this.selectedConnection) {
        this.deleteConnection(this.selectedConnection);
        this.selectedConnection = null;
      }
      this.cdr.markForCheck();
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  onNodeClick(nodeId: string) {
    this.selectedNodeId = nodeId;
    this.selectedConnection = null;
    this.cdr.markForCheck();
  }

  onConnectionClick(event: MouseEvent, conn: Connection) {
    event.stopPropagation();
    this.selectedConnection = conn;
    this.selectedNodeId = null;
    this.cdr.markForCheck();
  }

  onEditorClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.node-block') && !target.closest('.context-menu')) {
      this.selectedNodeId = null;
      this.selectedConnection = null;
      this.contextMenu.visible = false;
      this.cdr.markForCheck();
    }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    const newScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, this.scale + delta));
    if (newScale === this.scale) return;

    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    const ratio = newScale / this.scale;

    this.workspaceOffset = {
      x: mouseX - ratio * (mouseX - this.workspaceOffset.x),
      y: mouseY - ratio * (mouseY - this.workspaceOffset.y),
    };
    this.scale = newScale;
    this.cdr.markForCheck();
  }

  zoomIn()  { this.applyZoom(this.scale + 0.1); }
  zoomOut() { this.applyZoom(this.scale - 0.1); }
  private applyZoom(s: number) {
    this.scale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, s));
    this.cdr.markForCheck();
  }
  resetView() {
    this.scale = 1;
    this.workspaceOffset = { x: 0, y: 0 };
    this.cdr.markForCheck();
  }

  // ── Pan ───────────────────────────────────────────────────────────────────

  startPan(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      target.closest('.node-block') ||
      target.closest('.context-menu') ||
      target.classList.contains('connector')
    ) return;
    this.isPanning = true;
    this.panStart      = { x: event.clientX, y: event.clientY };
    this.initialOffset = { ...this.workspaceOffset };
  }

  onEditorMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.workspaceOffset = {
        x: this.initialOffset.x + (event.clientX - this.panStart.x),
        y: this.initialOffset.y + (event.clientY - this.panStart.y),
      };
      this.cdr.markForCheck();
    }
    if (this.tempLine) {
      const wsRect = this.workspaceRef.nativeElement.getBoundingClientRect();
      this.tempLine = {
        ...this.tempLine,
        end: {
          x: (event.clientX - wsRect.left) / this.scale,
          y: (event.clientY - wsRect.top)  / this.scale,
        },
      };
      this.cdr.markForCheck();
    }
  }

  onEditorMouseUp(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('connector') && this.tempLine) {
      this.tempLine = null;
      this.connectionStart = null;
      this.cdr.markForCheck();
    }
    this.endPan();
  }

  endPan() { this.isPanning = false; }

  // ── Connections ───────────────────────────────────────────────────────────

  beginConnection(evt: { nodeId: string; anchor: 'left' | 'right'; point: Point }) {
    this.connectionStart = evt;
    this.tempLine = { start: { ...evt.point }, end: { ...evt.point } };
    this.cdr.markForCheck();
  }

  completeConnection(toNodeId: string, toAnchor: 'left' | 'right') {
    if (!this.connectionStart) return;
    const from = { nodeId: this.connectionStart.nodeId, anchor: this.connectionStart.anchor };
    const to   = { nodeId: toNodeId, anchor: toAnchor };

    if (from.nodeId === to.nodeId) { this.cancelConnection(); return; }
    if (from.anchor !== 'right' || to.anchor !== 'left') { this.cancelConnection(); return; }

    const exists = this.connections.some(
      c => c.from.nodeId === from.nodeId && c.from.anchor === from.anchor
        && c.to.nodeId   === to.nodeId   && c.to.anchor   === to.anchor
    );
    if (exists) { this.cancelConnection(); return; }

    this.connections = [...this.connections, { from, to }];
    this.cancelConnection();
  }

  private cancelConnection() {
    this.tempLine = null;
    this.connectionStart = null;
    this.cdr.markForCheck();
  }

  // ── Context menu ──────────────────────────────────────────────────────────

  onNodeRightClick(event: MouseEvent, nodeId: string) {
    event.preventDefault();
    event.stopPropagation();
    const pos = this.viewportToContainer(event.clientX, event.clientY);
    this.contextMenu = { visible: true, x: pos.x, y: pos.y, target: { type: 'node', nodeId } };
    this.cdr.markForCheck();
  }

  onConnectionRightClick(event: MouseEvent, conn: Connection) {
    event.preventDefault();
    event.stopPropagation();
    const pos = this.viewportToContainer(event.clientX, event.clientY);
    this.contextMenu = { visible: true, x: pos.x, y: pos.y, target: { type: 'connection', from: conn.from, to: conn.to } };
    this.cdr.markForCheck();
  }

  deleteTarget() {
    if (!this.contextMenu.target) return;
    if (this.contextMenu.target.type === 'node') {
      this.deleteNodeById(this.contextMenu.target.nodeId);
    } else if (this.contextMenu.target.type === 'connection') {
      this.deleteConnection(this.contextMenu.target);
    }
    this.contextMenu.visible = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:click')
  hideContextMenu() {
    if (this.contextMenu.visible) {
      this.contextMenu.visible = false;
      this.cdr.markForCheck();
    }
  }

  // ── Delete helpers ────────────────────────────────────────────────────────

  private deleteNodeById(nodeId: string) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(
      c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
    );
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    this.cdr.markForCheck();
  }

  private deleteConnection(target: { from: Connection['from']; to: Connection['to'] }) {
    this.connections = this.connections.filter(
      c => !(c.from.nodeId === target.from.nodeId
          && c.from.anchor  === target.from.anchor
          && c.to.nodeId    === target.to.nodeId
          && c.to.anchor    === target.to.anchor)
    );
    if (this.selectedConnection
      && this.selectedConnection.from.nodeId === target.from.nodeId
      && this.selectedConnection.to.nodeId   === target.to.nodeId) {
      this.selectedConnection = null;
    }
    this.cdr.markForCheck();
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────

  addNode(type: NodeData['type']) {
    const id = Math.random().toString(36).substring(2, 9);
    const label = `${type.charAt(0).toUpperCase() + type.slice(1)} Node`;

    const containerEl = this.containerRef?.nativeElement;
    const cw = containerEl ? containerEl.clientWidth  : 800;
    const ch = containerEl ? containerEl.clientHeight : 400;

    const viewLeft = -this.workspaceOffset.x / this.scale;
    const viewTop  = -this.workspaceOffset.y / this.scale;

    const NODE_W = 200;
    const NODE_H = 100;
    const GAP    = 20;

    const sameType    = this.nodes.filter(n => n.type === type).length;
    const visibleWidth = cw / this.scale;
    const nodesPerRow  = Math.max(1, Math.floor((visibleWidth - GAP) / (NODE_W + GAP)));
    const col = sameType % nodesPerRow;
    const row = Math.floor(sameType / nodesPerRow);

    const margin = 20 / this.scale;
    const position = {
      x: viewLeft + margin + col * (NODE_W + GAP),
      y: viewTop  + margin + row * (NODE_H + GAP),
    };

    this.nodes = [...this.nodes, { id, label, type, position, header: label, fields: [] }];
    this.cdr.markForCheck();
  }

  onNodePositionChange(evt: { nodeId: string; position: Point }) {
    const node = this.nodes.find(n => n.id === evt.nodeId);
    if (node) {
      node.position = evt.position;
      this.cdr.markForCheck();
    }
  }

  trackById(_: number, node: NodeData) { return node.id; }

  // ── SVG paths ─────────────────────────────────────────────────────────────

  getAnchorPosition(ref: { nodeId: string; anchor: 'left' | 'right' }): Point | null {
    const el = document.getElementById(`connector-${ref.nodeId}-${ref.anchor}`);
    if (!el || !this.workspaceRef) return null;
    const elRect = el.getBoundingClientRect();
    const wsRect = this.workspaceRef.nativeElement.getBoundingClientRect();
    return {
      x: (elRect.left + elRect.width  / 2 - wsRect.left) / this.scale,
      y: (elRect.top  + elRect.height / 2 - wsRect.top)  / this.scale,
    };
  }

  getConnectionPath(conn: Connection): string {
    return this.buildBezier(
      this.getAnchorPosition(conn.from),
      this.getAnchorPosition(conn.to)
    );
  }

  getTempLinePath(): string {
    if (!this.tempLine) return '';
    return this.buildBezier(this.tempLine.start, this.tempLine.end);
  }

  private buildBezier(start: Point | null, end: Point | null): string {
    if (!start || !end) return '';
    const dx = Math.abs(end.x - start.x) * 0.55;
    return `M ${start.x},${start.y} C ${start.x + dx},${start.y} ${end.x - dx},${end.y} ${end.x},${end.y}`;
  }

  // ── Transform / workspace size ────────────────────────────────────────────

  getWorkspaceTransform() {
    return `translate(${this.workspaceOffset.x}px, ${this.workspaceOffset.y}px) scale(${this.scale})`;
  }

  getGridBackgroundSize(): string {
    const cell = 24 * this.scale;
    return `${cell}px ${cell}px`;
  }

  getGridBackgroundPosition(): string {
    const cell = 24 * this.scale;
    const ox = ((this.workspaceOffset.x % cell) + cell) % cell;
    const oy = ((this.workspaceOffset.y % cell) + cell) % cell;
    return `${ox}px ${oy}px`;
  }

  getWorkspaceSize() {
    return {
      width:  this.workspaceBounds.maxX - this.workspaceBounds.minX,
      height: this.workspaceBounds.maxY - this.workspaceBounds.minY,
    };
  }

  getNodeTemplate(type: string, subType?: string): TemplateRef<any> | null {
    return this.templateMap.get(subType ? `${type}:${subType}` : type) ?? null;
  }

  private viewportToWorkspace(clientX: number, clientY: number): Point {
    const wsRect = this.workspaceRef?.nativeElement.getBoundingClientRect();
    if (!wsRect) return { x: clientX, y: clientY };
    return {
      x: (clientX - wsRect.left) / this.scale,
      y: (clientY - wsRect.top)  / this.scale,
    };
  }

  private viewportToContainer(clientX: number, clientY: number): Point {
    const rect = this.containerRef?.nativeElement.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NgModule wrapper
// ─────────────────────────────────────────────────────────────────────────────

@NgModule({
  imports:  [CommonModule, NodeTemplateDirective, NodeEditorComponent, NodeFieldsComponent],
  exports:  [NodeTemplateDirective, NodeEditorComponent, NodeFieldsComponent],
})
export class NodeEditorModule {}