import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeData, NodeEditorModule, NodePaletteGroup } from 'ng-my-own-ui';

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [CommonModule, NodeEditorModule],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.scss'
})
export class NodeEditorComponent {

  // ── Initial canvas nodes ──────────────────────────────────────────────────
  nodes: NodeData[] = [
    {
      id: 'inputA', label: 'Table A', header: 'Input A',
      type: 'input', subType: 'table',
      position: { x: 40, y: 60 },
      fields: [
        { key: 'tableName', type: 'text',     label: 'Table', value: 'users',
          transform: (raw: string) => `FROM ${raw}` },
        { key: 'limit',     type: 'slider',   label: 'Limit', value: 50, min: 1, max: 200, step: 1,
          transform: (raw: number) => `LIMIT ${raw}` },
        { key: 'sortDir',   type: 'dropdown', label: 'Sort',  value: 'ASC', options: ['ASC','DESC'],
          transform: (raw: string, up: Record<string,any>) => `ORDER BY ${up['tableName'] ?? 'id'} ${raw}` },
        { key: 'activeOnly',type: 'checkbox', label: 'Active', value: true,
          transform: (raw: boolean) => raw ? 'WHERE active = 1' : '' }
      ]
    },
    {
      id: 'proc1', label: 'Filter', header: 'Filter',
      type: 'process', subType: 'filter',
      position: { x: 360, y: 150 },
      fields: [
        { key: 'condition', type: 'text', label: 'Condition', value: 'age > 18',
          transform: (raw: string, up: Record<string,any>) => {
            const w = up['activeOnly'] ?? '';
            return w ? `${w} AND ${raw}` : `WHERE ${raw}`;
          }
        }
      ]
    },
    {
      id: 'output1', label: 'Result', header: 'Output',
      type: 'output', subType: 'final',
      position: { x: 660, y: 150 }
    }
  ];

  // ── Palette — grouped node blueprints shown in the picker popup ───────────
  palette: NodePaletteGroup[] = [

    // ── Input groups ─────────────────────────────────────────────────────────
    {
      name: 'Database',
      type: 'input',
      items: [
        {
          label: 'SQL Table',
          description: 'Select rows from a SQL table',
          type: 'input', subType: 'table', header: 'SQL Table',
          fields: [
            { key: 'tableName', type: 'text',     label: 'Table',  value: '',
              transform: (raw: string) => `FROM ${raw}` },
            { key: 'limit',     type: 'slider',   label: 'Limit',  value: 100, min: 1, max: 1000, step: 1,
              transform: (raw: number) => `LIMIT ${raw}` },
            { key: 'sortDir',   type: 'dropdown', label: 'Sort',   value: 'ASC', options: ['ASC','DESC'],
              transform: (raw: string, up: Record<string,any>) => `ORDER BY ${up['tableName'] ?? 'id'} ${raw}` }
          ]
        },
        {
          label: 'Raw SQL Query',
          description: 'Execute a hand-written SQL query',
          type: 'input', subType: 'sql', header: 'SQL Query',
          fields: [
            { key: 'query', type: 'text', label: 'SQL', value: 'SELECT * FROM ...' }
          ]
        },
        {
          label: 'Stored Procedure',
          description: 'Call a stored procedure',
          type: 'input', subType: 'sql', header: 'Stored Proc',
          fields: [
            { key: 'procName', type: 'text', label: 'Proc', value: 'sp_getData' },
            { key: 'timeout',  type: 'slider', label: 'Timeout', value: 30, min: 1, max: 300 }
          ]
        }
      ]
    },
    {
      name: 'Files & APIs',
      type: 'input',
      items: [
        {
          label: 'CSV File',
          description: 'Read data from a CSV file',
          type: 'input', subType: 'file', header: 'CSV File',
          fields: [
            { key: 'filePath',  type: 'text',     label: 'Path',      value: '/data/file.csv' },
            { key: 'delimiter', type: 'dropdown', label: 'Delimiter', value: ',', options: [',', ';', '\\t', '|'] },
            { key: 'hasHeader', type: 'checkbox', label: 'Header',    value: true }
          ]
        },
        {
          label: 'REST API',
          description: 'Fetch data from a REST endpoint',
          type: 'input', subType: 'api', header: 'REST API',
          fields: [
            { key: 'url',    type: 'text',     label: 'URL',    value: 'https://api.example.com/data' },
            { key: 'method', type: 'radio',    label: 'Method', value: 'GET', options: ['GET','POST'] },
            { key: 'auth',   type: 'checkbox', label: 'Auth',   value: false }
          ]
        },
        {
          label: 'JSON File',
          type: 'input', subType: 'file', header: 'JSON File',
          fields: [
            { key: 'filePath', type: 'text', label: 'Path', value: '/data/file.json' }
          ]
        }
      ]
    },

    // ── Process groups ────────────────────────────────────────────────────────
    {
      name: 'Filtering & Sorting',
      type: 'process',
      items: [
        {
          label: 'Filter Rows',
          description: 'Keep rows matching a condition',
          type: 'process', subType: 'filter', header: 'Filter',
          fields: [
            { key: 'condition', type: 'text', label: 'Condition', value: '',
              transform: (raw: string) => raw ? `WHERE ${raw}` : '' }
          ]
        },
        {
          label: 'Order By',
          description: 'Sort rows by a column',
          type: 'process', subType: 'order', header: 'Order By',
          fields: [
            { key: 'column',  type: 'text',     label: 'Column', value: 'id' },
            { key: 'direction', type: 'radio',  label: 'Dir',    value: 'ASC', options: ['ASC','DESC'] }
          ]
        },
        {
          label: 'Limit',
          type: 'process', subType: 'filter', header: 'Limit',
          fields: [
            { key: 'limit', type: 'slider', label: 'Rows', value: 100, min: 1, max: 10000, step: 10,
              transform: (raw: number) => `LIMIT ${raw}` }
          ]
        }
      ]
    },
    {
      name: 'Aggregation',
      type: 'process',
      items: [
        {
          label: 'Group By',
          description: 'Aggregate rows by a column',
          type: 'process', subType: 'group', header: 'Group By',
          fields: [
            { key: 'column', type: 'text', label: 'Column', value: '' },
            { key: 'fn',     type: 'dropdown', label: 'Function', value: 'COUNT',
              options: ['COUNT','SUM','AVG','MIN','MAX'] }
          ]
        },
        {
          label: 'Having',
          type: 'process', subType: 'having', header: 'Having',
          fields: [
            { key: 'condition', type: 'text', label: 'Condition', value: '' }
          ]
        }
      ]
    },
    {
      name: 'Joins',
      type: 'process',
      items: [
        {
          label: 'Join',
          description: 'Join two data sources',
          type: 'process', subType: 'join', header: 'Join',
          fields: [
            { key: 'joinType', type: 'radio',    label: 'Type', value: 'INNER', options: ['INNER','LEFT','RIGHT','FULL'] },
            { key: 'onKey',    type: 'text',     label: 'On',   value: 'id' }
          ]
        },
        {
          label: 'Union',
          type: 'process', subType: 'join', header: 'Union',
          fields: [
            { key: 'distinct', type: 'checkbox', label: 'Distinct', value: true }
          ]
        }
      ]
    },
    {
      name: 'Transformation',
      type: 'process',
      items: [
        {
          label: 'Projection',
          description: 'Select specific columns',
          type: 'process', subType: 'projection', header: 'Projection',
          fields: [
            { key: 'columns', type: 'text', label: 'Columns', value: '*' }
          ]
        },
        {
          label: 'Rename Column',
          type: 'process', subType: 'projection', header: 'Rename',
          fields: [
            { key: 'from', type: 'text', label: 'From', value: '' },
            { key: 'to',   type: 'text', label: 'To',   value: '' }
          ]
        },
        {
          label: 'Type Cast',
          type: 'process', subType: 'projection', header: 'Cast',
          fields: [
            { key: 'column', type: 'text',     label: 'Column', value: '' },
            { key: 'toType', type: 'dropdown', label: 'Type',   value: 'VARCHAR',
              options: ['VARCHAR','INT','FLOAT','DATE','BOOLEAN'] }
          ]
        }
      ]
    },

    // ── Output groups ─────────────────────────────────────────────────────────
    {
      name: 'Storage',
      type: 'output',
      items: [
        {
          label: 'Result Table',
          description: 'Write results to a database table',
          type: 'output', subType: 'final', header: 'Output Table',
          fields: [
            { key: 'tableName', type: 'text',     label: 'Table', value: 'result' },
            { key: 'mode',      type: 'dropdown', label: 'Mode',  value: 'Append', options: ['Append','Overwrite','Upsert'] }
          ]
        },
        {
          label: 'Export CSV',
          type: 'output', subType: 'final', header: 'CSV Export',
          fields: [
            { key: 'path',      type: 'text',     label: 'Path',      value: '/export/out.csv' },
            { key: 'delimiter', type: 'dropdown', label: 'Delimiter', value: ',', options: [',',';','\\t'] }
          ]
        }
      ]
    },
    {
      name: 'Notifications',
      type: 'output',
      items: [
        {
          label: 'Email Report',
          type: 'output', subType: 'final', header: 'Email',
          fields: [
            { key: 'to',      type: 'text', label: 'To',      value: '' },
            { key: 'subject', type: 'text', label: 'Subject', value: 'Report' }
          ]
        },
        {
          label: 'Webhook',
          type: 'output', subType: 'final', header: 'Webhook',
          fields: [
            { key: 'url',    type: 'text',  label: 'URL',    value: 'https://' },
            { key: 'signed', type: 'checkbox', label: 'Sign', value: false }
          ]
        }
      ]
    }
  ];

  // ── Template helpers ──────────────────────────────────────────────────────

  asEntries(uv: Record<string, any>): [string, any][] {
    return Object.entries(uv ?? {}).filter(([k]) => !k.includes('.'));
  }

  hasEntries(uv: Record<string, any>): boolean {
    return Object.keys(uv ?? {}).some(k => !k.includes('.'));
  }
}