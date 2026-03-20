import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren,
  Directive, ElementRef, EventEmitter, HostListener, Input, NgModule,
  OnDestroy, OnInit, Output, QueryList, Renderer2, TemplateRef,
  ViewChild, ViewEncapsulation
} from '@angular/core';

// ─────────────────────────────────────────────────────────────────────────────
// Field system
// ─────────────────────────────────────────────────────────────────────────────

export type NodeFieldType = 'text' | 'radio' | 'checkbox' | 'slider' | 'dropdown';

export interface NodeFieldDef {
  key: string;
  type: NodeFieldType;
  label: string;
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  transform?: (rawValue: any, upstreamValues: Record<string, any>) => any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette system — defined by host app, drives the picker popup
// ─────────────────────────────────────────────────────────────────────────────

export type NodeType = 'input' | 'process' | 'output';

/**
 * A single item in the node palette — a "blueprint" for a node.
 * When the user picks it from the popup, a full NodeData is created from it.
 */
export interface NodePaletteItem {
  /** Displayed name in the picker list */
  label: string;
  /** Optional description shown as a subtitle in the picker */
  description?: string;
  /** Which toolbar button reveals this item */
  type: NodeType;
  /** Maps to NodeData.subType — selects the ng-template to render */
  subType?: string;
  /** Header text on the spawned node card */
  header: string;
  /** Pre-defined fields — deep-cloned on spawn so each node instance is independent */
  fields?: NodeFieldDef[];
}

/**
 * A named group of palette items — shown as a collapsible section in the picker.
 * The group name is editable inline.
 */
export interface NodePaletteGroup {
  /** Display name — editable in the picker UI */
  name: string;
  /** Which toolbar button reveals this group */
  type: NodeType;
  items: NodePaletteItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core structural types
// ─────────────────────────────────────────────────────────────────────────────

export interface NodeData {
  id: string;
  label: string;
  header: string;
  type: NodeType;
  subType?: string;
  position: { x: number; y: number };
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
// NodeFieldsComponent
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'node-fields',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nf-wrapper" *ngIf="fields && fields.length">
      <div class="nf-row" *ngFor="let f of fields">
        <label class="nf-label">{{ f.label }}</label>

        <input *ngIf="f.type === 'text'"
               class="nf-input nf-text" type="text"
               [(ngModel)]="f.value"
               (ngModelChange)="onFieldChange()"
               (mousedown)="$event.stopPropagation()"
               (click)="$event.stopPropagation()"/>

        <select *ngIf="f.type === 'dropdown'"
                class="nf-input nf-select"
                [(ngModel)]="f.value"
                (ngModelChange)="onFieldChange()"
                (mousedown)="$event.stopPropagation()"
                (click)="$event.stopPropagation()">
          <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
        </select>

        <label *ngIf="f.type === 'checkbox'" class="nf-checkbox-wrap"
               (mousedown)="$event.stopPropagation()"
               (click)="$event.stopPropagation()">
          <input type="checkbox" [(ngModel)]="f.value" (ngModelChange)="onFieldChange()"/>
          <span class="nf-checkbox-box" [class.checked]="f.value"></span>
        </label>

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

        <div *ngIf="f.type === 'slider'" class="nf-slider-wrap"
             (mousedown)="$event.stopPropagation()"
             (click)="$event.stopPropagation()">
          <input type="range" class="nf-slider"
                 [min]="f.min ?? 0" [max]="f.max ?? 100" [step]="f.step ?? 1"
                 [(ngModel)]="f.value"
                 (ngModelChange)="onFieldChange()"/>
          <span class="nf-slider-val">{{ f.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf-wrapper { border-top:1px solid #eee; padding:6px 8px 4px; display:flex; flex-direction:column; gap:5px; min-width:170px; }
    .nf-row { display:flex; align-items:center; gap:6px; font-size:0.75rem; }
    .nf-label { flex:0 0 60px; color:#555; font-size:0.72rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .nf-input { flex:1; font-size:0.75rem; border:1px solid #ccc; border-radius:3px; padding:2px 4px; outline:none; background:#fafafa; min-width:0; }
    .nf-input:focus { border-color:#007bff; background:#fff; }
    .nf-select { cursor:pointer; }
    .nf-checkbox-wrap { display:flex; align-items:center; cursor:pointer; }
    .nf-checkbox-wrap input[type=checkbox] { display:none; }
    .nf-checkbox-box { width:14px; height:14px; border:1.5px solid #bbb; border-radius:3px; background:#fff; display:flex; align-items:center; justify-content:center; transition:background 0.15s,border-color 0.15s; }
    .nf-checkbox-box.checked { background:#007bff; border-color:#007bff; }
    .nf-checkbox-box.checked::after { content:''; width:4px; height:7px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(40deg) translateY(-1px); display:block; }
    .nf-radio-group { display:flex; flex-wrap:wrap; gap:4px; }
    .nf-radio-opt { display:flex; align-items:center; gap:3px; font-size:0.72rem; cursor:pointer; white-space:nowrap; }
    .nf-slider-wrap { flex:1; display:flex; align-items:center; gap:5px; min-width:0; }
    .nf-slider { flex:1; height:3px; cursor:pointer; accent-color:#007bff; min-width:0; }
    .nf-slider-val { font-size:0.7rem; color:#666; min-width:24px; text-align:right; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeFieldsComponent {
  @Input() fields: NodeFieldDef[] = [];
  @Output() fieldChange = new EventEmitter<void>();
  instanceId = Math.random().toString(36).substring(2, 7);
  onFieldChange() { this.fieldChange.emit(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// NodePickerComponent — searchable popup that appears when toolbar btn clicked
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'node-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- No backdrop div — picker is a direct child of the editor container
         which is position:relative. Outside-clicks are handled by the editor's
         onEditorClick. The panel itself stops all pointer/wheel events so
         the canvas underneath is unaffected. -->
    <div class="picker-panel"
         [class.picker-input]="nodeType === 'input'"
         [class.picker-process]="nodeType === 'process'"
         [class.picker-output]="nodeType === 'output'"
         [style.max-height.px]="maxPanelHeight"
         (mousedown)="$event.stopPropagation()"
         (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="picker-header">
        <span class="picker-title">
          <span class="picker-type-dot" [class]="'dot-' + nodeType"></span>
          Add {{ nodeType | titlecase }} Node
        </span>
        <button class="picker-close" (click)="close.emit()">✕</button>
      </div>

      <!-- Search -->
      <div class="picker-search-wrap">
        <span class="picker-search-icon">⌕</span>
        <input #searchInput
               class="picker-search"
               type="text"
               placeholder="Search nodes…"
               [(ngModel)]="searchQuery"
               (ngModelChange)="onSearch()"
               (mousedown)="$event.stopPropagation()"
               (keydown.escape)="close.emit()"/>
        <button *ngIf="searchQuery" class="picker-clear" (click)="clearSearch()">✕</button>
      </div>

      <!-- Groups — wheel events stopped here so canvas zoom is unaffected -->
      <div class="picker-scroll" (wheel)="$event.stopPropagation()">
        <ng-container *ngFor="let group of filteredGroups">
          <div class="picker-group" *ngIf="group.visibleItems.length">

            <!-- Group header with editable name -->
            <div class="picker-group-header" (click)="group.collapsed = !group.collapsed">
              <span class="picker-group-chevron">{{ group.collapsed ? '▶' : '▼' }}</span>

              <span *ngIf="!group.editing"
                    class="picker-group-name">{{ group.name }}</span>
              <input *ngIf="group.editing"
                     class="picker-group-input"
                     [(ngModel)]="group.name"
                     (blur)="group.editing = false"
                     (keydown.enter)="group.editing = false"
                     (keydown.escape)="group.editing = false"
                     (mousedown)="$event.stopPropagation()"
                     (click)="$event.stopPropagation()"/>

              <span class="picker-group-count">{{ group.visibleItems.length }}</span>
              <button class="picker-group-edit"
                      title="Rename group"
                      (click)="beginGroupRename(group, $event)">✎</button>
            </div>

            <!-- Items -->
            <div class="picker-items" *ngIf="!group.collapsed">
              <div class="picker-item"
                   *ngFor="let item of group.visibleItems"
                   (click)="selectItem(item)"
                   [innerHTML]="highlightMatch(item.label, searchQuery)">
              </div>
            </div>
          </div>
        </ng-container>

        <div class="picker-empty" *ngIf="totalVisible === 0">
          No nodes match "{{ searchQuery }}"
        </div>
      </div>
    </div>
  `,
  styles: [`
    .picker-panel {
      position: absolute;
      width: 280px;
      /* max-height is set dynamically via [style.max-height.px] binding */
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-size: 0.82rem;
      z-index: 99999;
    }
    /* colour-coded top border per type */
    .picker-input   { border-top: 3px solid #28a745; }
    .picker-process { border-top: 3px solid #007bff; }
    .picker-output  { border-top: 3px solid #dc3545; }

    /* Header */
    .picker-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px 6px;
      border-bottom: 1px solid #f0f0f0;
    }
    .picker-title { display:flex; align-items:center; gap:6px; font-weight:600; font-size:0.85rem; }
    .picker-type-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
    .dot-input   { background:#28a745; }
    .dot-process { background:#007bff; }
    .dot-output  { background:#dc3545; }
    .picker-close {
      background:none; border:none; cursor:pointer; font-size:0.9rem;
      color:#aaa; padding:2px 4px; border-radius:3px; line-height:1;
    }
    .picker-close:hover { color:#333; background:#f5f5f5; }

    /* Search */
    .picker-search-wrap {
      display:flex; align-items:center; gap:4px;
      padding:6px 8px; border-bottom:1px solid #f0f0f0;
    }
    .picker-search-icon { color:#aaa; font-size:1rem; line-height:1; }
    .picker-search {
      flex:1; border:none; outline:none; font-size:0.8rem;
      background:transparent; color:#333;
    }
    .picker-clear {
      background:none; border:none; cursor:pointer; color:#aaa;
      font-size:0.75rem; padding:0 2px; line-height:1;
    }
    .picker-clear:hover { color:#333; }

    /* Scroll area */
    .picker-scroll { flex:1; overflow-y:auto; padding:4px 0; }

    /* Group */
    .picker-group { margin-bottom:2px; }
    .picker-group-header {
      display:flex; align-items:center; gap:5px;
      padding:5px 10px; cursor:pointer;
      color:#555; font-size:0.76rem; font-weight:600;
      letter-spacing:0.03em; text-transform:uppercase;
      user-select:none;
    }
    .picker-group-header:hover { background:#f9f9f9; }
    .picker-group-chevron { font-size:0.6rem; color:#aaa; width:10px; }
    .picker-group-name { flex:1; }
    .picker-group-input {
      flex:1; border:none; border-bottom:1px solid #007bff;
      outline:none; font-size:0.76rem; font-weight:600;
      text-transform:uppercase; letter-spacing:0.03em;
      background:transparent; color:#555; padding:0;
    }
    .picker-group-count {
      background:#eee; border-radius:8px;
      padding:0 5px; font-size:0.68rem; color:#888;
    }
    .picker-group-edit {
      background:none; border:none; cursor:pointer;
      color:#bbb; font-size:0.82rem; padding:0 2px; line-height:1;
    }
    .picker-group-edit:hover { color:#007bff; }

    /* Items */
    .picker-items { padding:2px 0; }
    .picker-item {
      padding:6px 12px 6px 24px;
      cursor:pointer; color:#333;
      transition:background 0.1s;
    }
    .picker-item:hover { background:#f0f6ff; color:#007bff; }
    /* highlight spans injected by highlightMatch() */
    .picker-item :global(.hl) {
      background:#fff3b0; border-radius:2px; font-weight:600;
    }

    .picker-empty {
      text-align:center; color:#bbb; font-size:0.78rem;
      padding:20px 10px; font-style:italic;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodePickerComponent implements OnInit {
  @Input() nodeType!: NodeType;
  @Input() groups: NodePaletteGroup[] = [];
  /** Pixel position (container-relative) where the panel should appear */
  @Input() anchorX = 0;
  @Input() anchorY = 0;
  /** Container dimensions — used to clamp panel height */
  @Input() containerW = 0;
  @Input() containerH = 0;

  @Output() pick  = new EventEmitter<NodePaletteItem>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputRef!: ElementRef;

  searchQuery = '';

  filteredGroups: Array<NodePaletteGroup & { visibleItems: NodePaletteItem[]; collapsed: boolean; editing: boolean }> = [];

  get totalVisible() { return this.filteredGroups.reduce((s, g) => s + g.visibleItems.length, 0); }

  /**
   * Max height for the panel — keeps it inside the container vertically.
   * anchorY is the top edge of the panel; we allow 16px bottom margin.
   */
  get maxPanelHeight(): number {
    const available = this.containerH - this.anchorY - 16;
    return Math.max(160, Math.min(available, 480));
  }

  ngOnInit() {
    this.buildFilteredGroups();
    // Focus search box after render
    setTimeout(() => this.searchInputRef?.nativeElement.focus(), 50);
  }

  private buildFilteredGroups() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredGroups = this.groups
      .filter(g => g.type === this.nodeType)
      .map(g => ({
        ...g,
        visibleItems: g.items.filter(item =>
          !q || item.label.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)
        ),
        collapsed: false,
        editing: false,
      }));
  }

  onSearch() { this.buildFilteredGroups(); }
  clearSearch() { this.searchQuery = ''; this.buildFilteredGroups(); }

  selectItem(item: NodePaletteItem) { this.pick.emit(item); }

  beginGroupRename(group: any, event: MouseEvent) {
    event.stopPropagation();
    group.editing = true;
    const btn = event.currentTarget as HTMLElement;
    setTimeout(() => {
      const header = btn.closest('.picker-group-header');
      const input = header?.querySelector<HTMLInputElement>('.picker-group-input');
      input?.focus();
      input?.select();
    }, 20);
  }

  /** Wraps matching substring in a <span class="hl"> for highlighting */
  highlightMatch(label: string, query: string): string {
    if (!query.trim()) return label;
    const idx = label.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return label;
    return (
      label.slice(0, idx) +
      `<span style="background:#fff3b0;border-radius:2px;font-weight:600">` +
      label.slice(idx, idx + query.length) +
      `</span>` +
      label.slice(idx + query.length)
    );
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
      <node-fields *ngIf="fields && fields.length"
                   [fields]="fields"
                   (fieldChange)="onFieldChanged()">
      </node-fields>
      <div class="node-content"><ng-content></ng-content></div>
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
    .node-block { position:absolute; min-width:200px; background:#fff; border:1px solid #9f9f9f; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.1); padding:0; box-sizing:border-box; z-index:1; }
    .node-block.node-type-input   { border-top:3px solid #28a745; }
    .node-block.node-type-output  { border-top:3px solid #dc3545; }
    .node-block.node-type-process { border-top:3px solid #007bff; }
    .node-block.node-selected { outline:2px solid #007bff; outline-offset:2px; box-shadow:0 0 0 3px rgba(0,123,255,0.25); }
    .node-header { background:#e9e9e9; padding:0.25rem 0.5rem; font-weight:700; border-bottom:1px solid #ccc; border-radius:4px 4px 0 0; font-size:0.8rem; text-align:center; cursor:move; user-select:none; }
    .node-content { padding:8px; }
    .connector { width:12px; height:12px; position:absolute; top:50%; cursor:crosshair; border-radius:50%; border:2px solid #fff; box-sizing:border-box; z-index:2; transition:transform 0.1s; }
    .connector.left  { left:-7px;  transform:translateY(-50%); background:#28a745; }
    .connector.right { right:-7px; transform:translateY(-50%); background:#007bff; }
    .connector.left:hover  { transform:translateY(-50%) scale(1.35); }
    .connector.right:hover { transform:translateY(-50%) scale(1.35); }
    .node-dragging { box-shadow:0 4px 14px rgba(0,0,0,0.35); }
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
  @Output() fieldChange     = new EventEmitter<string>();

  nodeClass = '';
  private isDragging = false;
  private offset = { x: 0, y: 0 };

  constructor(private el: ElementRef, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.nodeClass = `node-type-${this.type}`; }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);
  }

  onFieldChanged() { this.fieldChange.emit(this.id); }

  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('connector')) { event.stopPropagation(); return; }
    if (!target.classList.contains('node-header')) return;
    event.stopPropagation();
    this.isDragging = true;
    this.offset = { x: event.offsetX, y: event.offsetY };
    (target.closest('.node-block') as HTMLElement)?.classList.add('node-dragging');
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup',   this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;
    const workspace = (this.el.nativeElement as HTMLElement).parentElement;
    const rect = workspace?.getBoundingClientRect();
    if (!rect) return;
    const scaleMatch = (workspace?.style.transform ?? '').match(/scale\(([^)]+)\)/);
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
    (this.el.nativeElement as HTMLElement).querySelector('.node-block')?.classList.remove('node-dragging');
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);
  };

  startConnection(event: MouseEvent, anchor: 'left' | 'right') {
    event.stopPropagation();
    const rect   = (event.target as HTMLElement).getBoundingClientRect();
    const workspace = (this.el.nativeElement as HTMLElement).parentElement;
    const wsRect = workspace?.getBoundingClientRect();
    if (!wsRect) return;
    const scaleMatch = (workspace?.style.transform ?? '').match(/scale\(([^)]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    this.startConnect.emit({
      nodeId: this.id, anchor,
      point: {
        x: (rect.left + rect.width  / 2 - wsRect.left) / scale,
        y: (rect.top  + rect.height / 2 - wsRect.top)  / scale,
      }
    });
  }

  @HostListener('mouseup', ['$event'])
  handleMouseUp(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('connector')) {
      this.completeConnect.emit(target.classList.contains('left') ? 'left' : 'right');
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
  imports: [CommonModule, NodeComponent, NodePickerComponent],
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

      <!-- Workspace (panned + zoomed) -->
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
                  fill="none" stroke-linecap="round" style="cursor:pointer"
                  pointer-events="stroke" marker-end="url(#conn-arrow)"
                  (contextmenu)="onConnectionRightClick($event, conn)"
                  (click)="onConnectionClick($event, conn)"/>
          </g>
          <path *ngIf="tempLine"
                [attr.d]="getTempLinePath()"
                stroke="#888" stroke-dasharray="6 3"
                fill="none" stroke-width="2" stroke-linecap="round"/>
        </svg>

        <node-block
          *ngFor="let node of nodes; trackBy: trackById"
          [id]="node.id" [type]="node.type" [header]="node.header"
          [position]="node.position" [selected]="selectedNodeId === node.id"
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
                          label: node.label, header: node.header,
                          type: node.type, subType: node.subType,
                          upstreamValues: getUpstreamValues(node.id)
                        }">
          </ng-container>
        </node-block>
      </div>

      <!-- Context menu (container-relative, outside workspace) -->
      <div *ngIf="contextMenu.visible"
           class="context-menu"
           [style.left.px]="contextMenu.x"
           [style.top.px]="contextMenu.y">
        <button (click)="deleteTarget(); $event.stopPropagation()">🗑 Delete</button>
      </div>

      <!-- Node picker popup -->
      <node-picker
        *ngIf="picker.visible"
        [nodeType]="picker.forType"
        [groups]="palette"
        [anchorX]="picker.x"
        [anchorY]="picker.y"
        [containerW]="editorWidth"
        [containerH]="editorHeight"
        [style.position]="'absolute'"
        [style.left.px]="picker.x"
        [style.top.px]="picker.y"
        [style.z-index]="99999"
        (pick)="onPickerSelect($event)"
        (close)="closePicker()">
      </node-picker>

      <!-- Toolbar -->
      <div class="editor-toolbar">
        <button class="toolbar-btn btn-input"
                [class.active]="picker.visible && picker.forType==='input'"
                (click)="openPicker('input', $event)">+ Input ▾</button>
        <button class="toolbar-btn btn-process"
                [class.active]="picker.visible && picker.forType==='process'"
                (click)="openPicker('process', $event)">+ Process ▾</button>
        <button class="toolbar-btn btn-output"
                [class.active]="picker.visible && picker.forType==='output'"
                (click)="openPicker('output', $event)">+ Output ▾</button>
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
    :host { display:block; }
    .node-editor-container {
      width:100%; height:100%;
      background-color:#f5f5f5;
      background-image:
        linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
      border:1px solid #ccc; position:relative; user-select:none;
      overflow:hidden; cursor:grab; outline:none; box-sizing:border-box;
    }
    .node-editor-container.is-panning { cursor:grabbing; }
    .workspace { position:absolute; left:0; top:0; transform-origin:0 0; }
    .connection-lines { position:absolute; top:0; left:0; pointer-events:none; z-index:0; overflow:visible; }
    .context-menu {
      position:absolute; background:#fff; border:1px solid #ddd; border-radius:5px;
      z-index:9999; padding:4px; box-shadow:0 4px 14px rgba(0,0,0,0.15); min-width:110px;
    }
    .context-menu button {
      background:none; border:none; padding:6px 12px; width:100%;
      text-align:left; cursor:pointer; font-size:0.82rem; border-radius:3px;
    }
    .context-menu button:hover { background:#f5f5f5; }
    .editor-toolbar {
      position:absolute; top:10px; right:10px; z-index:1000;
      display:flex; gap:5px; align-items:center;
      background:rgba(255,255,255,0.92); border:1px solid #ddd;
      border-radius:6px; padding:5px 8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.1);
    }
    .toolbar-btn {
      background:#fff; border:1px solid #ccc; border-radius:4px;
      padding:3px 9px; font-size:0.78rem; cursor:pointer;
      white-space:nowrap; line-height:1.6; transition:all 0.1s;
    }
    .toolbar-btn:hover  { background:#f0f0f0; }
    .toolbar-btn:active { transform:translateY(1px); }
    .toolbar-btn.active { box-shadow:inset 0 1px 3px rgba(0,0,0,0.15); }
    .btn-process { border-color:#007bff; color:#007bff; }
    .btn-input   { border-color:#28a745; color:#28a745; }
    .btn-output  { border-color:#dc3545; color:#dc3545; }
    .btn-process.active { background:#e8f0ff; }
    .btn-input.active   { background:#e8f8ec; }
    .btn-output.active  { background:#fdf0f0; }
    .toolbar-sep { width:1px; height:18px; background:#ddd; margin:0 2px; }
    .zoom-label  { font-size:0.75rem; color:#666; min-width:34px; text-align:center; }
    .editor-hint {
      position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
      font-size:0.7rem; color:#999; background:rgba(255,255,255,0.7);
      padding:2px 10px; border-radius:10px; pointer-events:none; white-space:nowrap;
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

  /**
   * Palette groups — defined in host component.ts.
   * Each group belongs to one NodeType and contains NodePaletteItems.
   * Clicking a toolbar button opens the picker filtered to that type.
   */
  @Input() palette: NodePaletteGroup[] = [];

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

  /** Picker popup state */
  picker: { visible: boolean; forType: NodeType; x: number; y: number } =
    { visible: false, forType: 'process', x: 0, y: 0 };

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
    for (const tpl of this.templates) this.templateMap.set(tpl.type, tpl.template);
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.containerRef.nativeElement, 'height', this.containerHeight + 'px');
    this.renderer.setAttribute(this.containerRef.nativeElement, 'tabindex', '0');
    this.editorWidth  = this.containerRef.nativeElement.clientWidth;
    this.editorHeight = this.containerRef.nativeElement.clientHeight;
  }

  ngOnDestroy() {}

  // ── Picker ────────────────────────────────────────────────────────────────

  openPicker(type: NodeType, event: MouseEvent) {
    event.stopPropagation();
    const btn = event.currentTarget as HTMLElement;
    const btnRect       = btn.getBoundingClientRect();
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();

    const PANEL_W = 280;
    const MARGIN  = 8;

    // Preferred: left-align panel with button
    let x = btnRect.left - containerRect.left;
    // Clamp so right edge stays inside container
    x = Math.min(x, containerRect.width - PANEL_W - MARGIN);
    x = Math.max(MARGIN, x);

    // Position just below the toolbar button
    const y = btnRect.bottom - containerRect.top + 4;

    // Toggle: same type → close
    if (this.picker.visible && this.picker.forType === type) {
      this.closePicker();
      return;
    }

    this.picker = { visible: true, forType: type, x, y };
    this.cdr.markForCheck();
  }

  closePicker() {
    this.picker = { ...this.picker, visible: false };
    this.cdr.markForCheck();
  }

  /**
   * Called when user clicks an item in the picker.
   * Deep-clones the palette item's fields so each spawned node is independent.
   */
  onPickerSelect(item: NodePaletteItem) {
    const id = Math.random().toString(36).substring(2, 9);

    // Place at centre of visible viewport
    const containerEl = this.containerRef?.nativeElement;
    const cw = containerEl ? containerEl.clientWidth  : 800;
    const ch = containerEl ? containerEl.clientHeight : 400;
    const sameType = this.nodes.filter(n => n.type === item.type).length;
    const NODE_W = 200, NODE_H = 100, GAP = 20;
    const viewLeft = -this.workspaceOffset.x / this.scale;
    const viewTop  = -this.workspaceOffset.y / this.scale;
    const visibleWidth = cw / this.scale;
    const nodesPerRow  = Math.max(1, Math.floor((visibleWidth - GAP) / (NODE_W + GAP)));
    const col = sameType % nodesPerRow;
    const row = Math.floor(sameType / nodesPerRow);
    const margin = 20 / this.scale;
    const position = {
      x: viewLeft + margin + col * (NODE_W + GAP),
      y: viewTop  + margin + row * (NODE_H + GAP),
    };

    // Deep-clone fields so each node instance has independent values
    const fields: NodeFieldDef[] = (item.fields ?? []).map(f => ({ ...f }));

    const newNode: NodeData = {
      id,
      label: item.label,
      header: item.header,
      type: item.type,
      subType: item.subType,
      position,
      fields,
    };

    this.nodes = [...this.nodes, newNode];
    this.closePicker();
    this.cdr.markForCheck();
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape') {
      if (this.picker.visible) { this.closePicker(); return; }
      if (this.tempLine) { this.tempLine = null; this.connectionStart = null; }
      this.selectedNodeId = null;
      this.selectedConnection = null;
      this.contextMenu.visible = false;
      this.cdr.markForCheck();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedNodeId) { this.deleteNodeById(this.selectedNodeId); this.selectedNodeId = null; }
      else if (this.selectedConnection) { this.deleteConnection(this.selectedConnection); this.selectedConnection = null; }
      this.cdr.markForCheck();
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  onNodeClick(nodeId: string) {
    this.selectedNodeId = nodeId; this.selectedConnection = null; this.cdr.markForCheck();
  }
  onConnectionClick(event: MouseEvent, conn: Connection) {
    event.stopPropagation(); this.selectedConnection = conn; this.selectedNodeId = null; this.cdr.markForCheck();
  }
  onEditorClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.node-block') && !target.closest('.context-menu') && !target.closest('node-picker')) {
      this.selectedNodeId = null; this.selectedConnection = null;
      this.contextMenu.visible = false;
      this.closePicker();
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
  resetView() { this.scale = 1; this.workspaceOffset = { x: 0, y: 0 }; this.cdr.markForCheck(); }

  // ── Pan ───────────────────────────────────────────────────────────────────

  startPan(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.node-block') || target.closest('.context-menu') ||
        target.closest('node-picker')  || target.classList.contains('connector')) return;
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
      this.tempLine = null; this.connectionStart = null; this.cdr.markForCheck();
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

  private cancelConnection() { this.tempLine = null; this.connectionStart = null; this.cdr.markForCheck(); }

  // ── Context menu ──────────────────────────────────────────────────────────

  onNodeRightClick(event: MouseEvent, nodeId: string) {
    event.preventDefault(); event.stopPropagation();
    const pos = this.viewportToContainer(event.clientX, event.clientY);
    this.contextMenu = { visible: true, x: pos.x, y: pos.y, target: { type: 'node', nodeId } };
    this.cdr.markForCheck();
  }

  onConnectionRightClick(event: MouseEvent, conn: Connection) {
    event.preventDefault(); event.stopPropagation();
    const pos = this.viewportToContainer(event.clientX, event.clientY);
    this.contextMenu = { visible: true, x: pos.x, y: pos.y, target: { type: 'connection', from: conn.from, to: conn.to } };
    this.cdr.markForCheck();
  }

  deleteTarget() {
    if (!this.contextMenu.target) return;
    if (this.contextMenu.target.type === 'node') this.deleteNodeById(this.contextMenu.target.nodeId);
    else if (this.contextMenu.target.type === 'connection') this.deleteConnection(this.contextMenu.target);
    this.contextMenu.visible = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:click')
  hideContextMenu() {
    if (this.contextMenu.visible) { this.contextMenu.visible = false; this.cdr.markForCheck(); }
  }

  // ── Delete helpers ────────────────────────────────────────────────────────

  private deleteNodeById(nodeId: string) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId);
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    this.cdr.markForCheck();
  }

  private deleteConnection(target: { from: Connection['from']; to: Connection['to'] }) {
    this.connections = this.connections.filter(
      c => !(c.from.nodeId === target.from.nodeId && c.from.anchor === target.from.anchor
          && c.to.nodeId   === target.to.nodeId   && c.to.anchor   === target.to.anchor)
    );
    if (this.selectedConnection
      && this.selectedConnection.from.nodeId === target.from.nodeId
      && this.selectedConnection.to.nodeId   === target.to.nodeId) this.selectedConnection = null;
    this.cdr.markForCheck();
  }

  // ── Data-flow: upstream value resolution ─────────────────────────────────

  getUpstreamValues(nodeId: string): Record<string, any> {
    const ancestors = this.getAncestorsInOrder(nodeId);
    const result: Record<string, any> = {};
    for (const ancestor of ancestors) {
      const node = this.nodes.find(n => n.id === ancestor);
      if (!node?.fields?.length) continue;
      for (const field of node.fields) {
        const transformed = field.transform ? field.transform(field.value, result) : field.value;
        result[`${node.id}.${field.key}`] = transformed;
        result[field.key] = transformed;
      }
    }
    return result;
  }

  private getAncestorsInOrder(nodeId: string): string[] {
    const visited = new Set<string>();
    const queue = [nodeId];
    const order: string[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      for (const p of this.connections.filter(c => c.to.nodeId === current).map(c => c.from.nodeId)) {
        if (!visited.has(p)) { visited.add(p); order.push(p); queue.push(p); }
      }
    }
    return order.reverse();
  }

  onFieldChange() { this.cdr.markForCheck(); }

  // ── Node position ─────────────────────────────────────────────────────────

  onNodePositionChange(evt: { nodeId: string; position: Point }) {
    const node = this.nodes.find(n => n.id === evt.nodeId);
    if (node) { node.position = evt.position; this.cdr.markForCheck(); }
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
    return this.buildBezier(this.getAnchorPosition(conn.from), this.getAnchorPosition(conn.to));
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

  // ── Transform / grid ──────────────────────────────────────────────────────

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
    return { width: this.workspaceBounds.maxX - this.workspaceBounds.minX, height: this.workspaceBounds.maxY - this.workspaceBounds.minY };
  }

  getNodeTemplate(type: string, subType?: string): TemplateRef<any> | null {
    return this.templateMap.get(subType ? `${type}:${subType}` : type) ?? null;
  }

  private viewportToWorkspace(clientX: number, clientY: number): Point {
    const wsRect = this.workspaceRef?.nativeElement.getBoundingClientRect();
    if (!wsRect) return { x: clientX, y: clientY };
    return { x: (clientX - wsRect.left) / this.scale, y: (clientY - wsRect.top) / this.scale };
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
  imports:  [CommonModule, NodeTemplateDirective, NodeEditorComponent, NodeFieldsComponent, NodePickerComponent],
  exports:  [NodeTemplateDirective, NodeEditorComponent, NodeFieldsComponent, NodePickerComponent],
})
export class NodeEditorModule {}