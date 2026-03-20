import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeData, NodeEditorModule } from 'ng-my-own-ui';

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [CommonModule, NodeEditorModule],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.scss'
})
export class NodeEditorComponent {

  nodes: NodeData[] = [

    // ── Input A: text + slider + dropdown + checkbox ─────────────────────────
    {
      id: 'inputA', label: 'Table A', header: 'Input A',
      type: 'input', subType: 'table',
      position: { x: 40, y: 60 },
      fields: [
        {
          key: 'tableName', type: 'text', label: 'Table', value: 'users',
          transform: (raw: string) => `FROM ${raw}`
        },
        {
          key: 'limit', type: 'slider', label: 'Limit', value: 50,
          min: 1, max: 200, step: 1,
          transform: (raw: number) => `LIMIT ${raw}`
        },
        {
          key: 'sortDir', type: 'dropdown', label: 'Sort', value: 'ASC',
          options: ['ASC', 'DESC'],
          // Reads tableName (short key) from the already-resolved upstream map
          transform: (raw: string, upstream: Record<string,any>) =>
            `ORDER BY ${upstream['tableName'] ?? 'id'} ${raw}`
        },
        {
          key: 'activeOnly', type: 'checkbox', label: 'Active only', value: true,
          transform: (raw: boolean) => raw ? 'WHERE active = 1' : ''
        }
      ]
    },

    // ── Input B: radio + text ────────────────────────────────────────────────
    {
      id: 'inputB', label: 'Table B', header: 'Input B',
      type: 'input', subType: 'table',
      position: { x: 40, y: 330 },
      fields: [
        {
          key: 'joinType', type: 'radio', label: 'Join', value: 'INNER',
          options: ['INNER', 'LEFT', 'RIGHT'],
          transform: (raw: string) => `${raw} JOIN`
        },
        {
          key: 'alias', type: 'text', label: 'Alias', value: 'b',
          transform: (raw: string) => raw.trim() || 'b'
        }
      ]
    },

    // ── Process: Filter — receives values from both inputs ───────────────────
    {
      id: 'proc1', label: 'Filter', header: 'Filter',
      type: 'process', subType: 'filter',
      position: { x: 360, y: 170 },
      fields: [
        {
          key: 'condition', type: 'text', label: 'Condition', value: 'age > 18',
          // Can read upstream activeOnly (already transformed) to combine clauses
          transform: (raw: string, upstream: Record<string,any>) => {
            const where = upstream['activeOnly'] ?? '';
            return where ? `${where} AND ${raw}` : `WHERE ${raw}`;
          }
        }
      ]
    },

    // ── Output: shows full resolved chain ────────────────────────────────────
    {
      id: 'output1', label: 'Result', header: 'Output',
      type: 'output', subType: 'final',
      position: { x: 660, y: 170 }
    }
  ];

  // ── Template helpers ──────────────────────────────────────────────────────

  /** Short-key entries only (no "nodeId.fieldKey" qualified ones) */
  asEntries(uv: Record<string, any>): [string, any][] {
    return Object.entries(uv ?? {}).filter(([k]) => !k.includes('.'));
  }

  hasEntries(uv: Record<string, any>): boolean {
    return Object.keys(uv ?? {}).some(k => !k.includes('.'));
  }
}