/**
 * Type definitions for the Equation Builder V2
 * Clean, simple types for a maintainable system
 */

export interface Position {
  x: number;
  y: number;
}

export interface Port {
  id: string;
  nodeId: string;
  type: 'input' | 'output';
  position: Position;
}

export interface Connection {
  id: string;
  from: string; // port id
  to: string;   // port id
}

export type NodeType = 
  | 'number'
  | 'variable' 
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'output';

export interface NodeData {
  id: string;
  type: NodeType;
  position: Position;
  value?: number;
  variable?: string;
  label: string;
  inputs: Port[];
  outputs: Port[];
}

export interface EquationBuilderState {
  nodes: Map<string, NodeData>;
  connections: Connection[];
  selectedNode: string | null;
  dragState: {
    isDragging: boolean;
    nodeId: string | null;
    offset: Position;
  };
}
