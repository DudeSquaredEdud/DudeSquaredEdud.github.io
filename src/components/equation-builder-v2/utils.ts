/**
 * Utility functions for Equation Builder V2
 * Clean, focused helper functions
 */

import type { NodeData, NodeType, Position, Connection } from './types';

// Generate unique IDs
export const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Calculate distance between two points
export const distance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Check if point is inside rectangle
export const isPointInRect = (point: Position, rect: DOMRect): boolean => {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
};

// Node factory function
export const createNode = (type: NodeType, position: Position): NodeData => {
  const id = generateId();
  const baseNode = {
    id,
    type,
    position,
    inputs: [],
    outputs: []
  };

  switch (type) {
    case 'number':
      return {
        ...baseNode,
        label: '0',
        value: 0,
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 80, y: position.y + 15 }
        }]
      };

    case 'variable':
      return {
        ...baseNode,
        label: 'x',
        variable: 'x',
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 80, y: position.y + 15 }
        }]
      };

    case 'add':
      return {
        ...baseNode,
        label: '+',
        inputs: [
          {
            id: `${id}-in1`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 10 }
          },
          {
            id: `${id}-in2`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 30 }
          }
        ],
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 60, y: position.y + 20 }
        }]
      };

    case 'subtract':
      return {
        ...baseNode,
        label: '−',
        inputs: [
          {
            id: `${id}-in1`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 10 }
          },
          {
            id: `${id}-in2`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 30 }
          }
        ],
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 60, y: position.y + 20 }
        }]
      };

    case 'multiply':
      return {
        ...baseNode,
        label: '×',
        inputs: [
          {
            id: `${id}-in1`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 10 }
          },
          {
            id: `${id}-in2`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 30 }
          }
        ],
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 60, y: position.y + 20 }
        }]
      };

    case 'divide':
      return {
        ...baseNode,
        label: '÷',
        inputs: [
          {
            id: `${id}-in1`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 10 }
          },
          {
            id: `${id}-in2`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 30 }
          }
        ],
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 60, y: position.y + 20 }
        }]
      };

    case 'power':
      return {
        ...baseNode,
        label: '^',
        inputs: [
          {
            id: `${id}-in1`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 10 }
          },
          {
            id: `${id}-in2`,
            nodeId: id,
            type: 'input' as const,
            position: { x: position.x, y: position.y + 30 }
          }
        ],
        outputs: [{
          id: `${id}-out`,
          nodeId: id,
          type: 'output' as const,
          position: { x: position.x + 60, y: position.y + 20 }
        }]
      };

    case 'output':
      return {
        ...baseNode,
        label: 'Result',
        inputs: [{
          id: `${id}-in`,
          nodeId: id,
          type: 'input' as const,
          position: { x: position.x, y: position.y + 15 }
        }]
      };

    default:
      throw new Error(`Unknown node type: ${type}`);
  }
};

// Generate equation from connected nodes
export const generateEquation = (nodes: Map<string, NodeData>, connections: Connection[]): string => {
  // Find the output node
  const outputNode = Array.from(nodes.values()).find(node => node.type === 'output');
  if (!outputNode || outputNode.inputs.length === 0) {
    return '';
  }

  // Find what's connected to the output
  const outputConnection = connections.find(conn => conn.to === outputNode.inputs[0].id);
  if (!outputConnection) {
    return '';
  }

  // Build equation recursively
  const buildExpression = (portId: string): string => {
    // Find the node that has this output port
    const sourceNode = Array.from(nodes.values()).find(node => 
      node.outputs.some(port => port.id === portId)
    );
    
    if (!sourceNode) return '';

    switch (sourceNode.type) {
      case 'number':
        return sourceNode.value?.toString() || '0';
      
      case 'variable':
        return sourceNode.variable || 'x';
      
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
      case 'power': {
        const inputConnections = connections.filter(conn => 
          sourceNode.inputs.some(port => port.id === conn.to)
        );
        
        if (inputConnections.length < 2) {
          return sourceNode.label;
        }

        const left = buildExpression(inputConnections[0].from);
        const right = buildExpression(inputConnections[1].from);
        
        const operator = sourceNode.type === 'add' ? '+' :
                        sourceNode.type === 'subtract' ? '-' :
                        sourceNode.type === 'multiply' ? '*' :
                        sourceNode.type === 'divide' ? '/' : '^';
        
        return `(${left} ${operator} ${right})`;
      }
      
      default:
        return '';
    }
  };

  return buildExpression(outputConnection.from);
};
