/**
 * Equation Builder V2 - Clean, Simple, Functional
 * 
 * A complete rewrite focusing on:
 * - Simplicity over complexity
 * - Working over perfect  
 * - Maintainable over feature-rich
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { NodeData, NodeType, Position, Connection, EquationBuilderState } from './types';
import { createNode, generateId, distance, generateEquation } from './utils';
import styles from './styles.module.css';

const EquationBuilderV2: React.FC = () => {
  // Core state - keep it simple
  const [state, setState] = useState<EquationBuilderState>({
    nodes: new Map(),
    connections: [],
    selectedNode: null,
    dragState: {
      isDragging: false,
      nodeId: null,
      offset: { x: 0, y: 0 }
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null
  });

  // Node palette configuration
  const nodeTypes: { type: NodeType; label: string; category: string }[] = [
    { type: 'number', label: 'Number', category: 'Generators' },
    { type: 'variable', label: 'Variable', category: 'Generators' },
    { type: 'add', label: 'Add (+)', category: 'Operators' },
    { type: 'subtract', label: 'Subtract (−)', category: 'Operators' },
    { type: 'multiply', label: 'Multiply (×)', category: 'Operators' },
    { type: 'divide', label: 'Divide (÷)', category: 'Operators' },
    { type: 'power', label: 'Power (^)', category: 'Operators' },
    { type: 'output', label: 'Output', category: 'Output' }
  ];

  // Group nodes by category
  const nodeCategories = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) acc[node.category] = [];
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, typeof nodeTypes>);

  // Add node to canvas
  const addNode = useCallback((type: NodeType, position: Position) => {
    const newNode = createNode(type, position);
    setState(prev => ({
      ...prev,
      nodes: new Map(prev.nodes).set(newNode.id, newNode)
    }));
  }, []);

  // Handle palette node drag to canvas
  const handlePaletteNodeDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('nodeType', nodeType);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;
    if (!nodeType) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left - 40, // Center the node
      y: e.clientY - rect.top - 20
    };

    addNode(nodeType, position);
  };

  // Handle node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = state.nodes.get(nodeId);
    if (!node) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setState(prev => ({
      ...prev,
      selectedNode: nodeId,
      dragState: {
        isDragging: true,
        nodeId,
        offset
      }
    }));
  };

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!state.dragState.isDragging || !state.dragState.nodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newPosition = {
      x: e.clientX - rect.left - state.dragState.offset.x,
      y: e.clientY - rect.top - state.dragState.offset.y
    };

    setState(prev => {
      const newNodes = new Map(prev.nodes);
      const node = newNodes.get(prev.dragState.nodeId!);
      if (node) {
        newNodes.set(node.id, { ...node, position: newPosition });
        // Update port positions
        const updatedNode = newNodes.get(node.id)!;
        updatedNode.inputs.forEach(port => {
          port.position = {
            x: newPosition.x,
            y: newPosition.y + (port.position.y - node.position.y)
          };
        });
        updatedNode.outputs.forEach(port => {
          port.position = {
            x: newPosition.x + 80,
            y: newPosition.y + (port.position.y - node.position.y)
          };
        });
      }
      return { ...prev, nodes: newNodes };
    });
  }, [state.dragState]);

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    setState(prev => ({
      ...prev,
      dragState: {
        isDragging: false,
        nodeId: null,
        offset: { x: 0, y: 0 }
      }
    }));
  }, []);

  // Add event listeners
  useEffect(() => {
    if (state.dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Handle port connections
  const handlePortClick = (portId: string) => {
    if (connecting.from === null) {
      setConnecting({ from: portId, to: null });
    } else if (connecting.from !== portId) {
      // Create connection
      const newConnection: Connection = {
        id: generateId(),
        from: connecting.from,
        to: portId
      };
      setState(prev => ({
        ...prev,
        connections: [...prev.connections, newConnection]
      }));
      setConnecting({ from: null, to: null });
    }
  };

  // Delete selected node
  const deleteSelectedNode = () => {
    if (!state.selectedNode) return;
    
    setState(prev => {
      const newNodes = new Map(prev.nodes);
      newNodes.delete(prev.selectedNode!);
      
      // Remove connections involving this node
      const newConnections = prev.connections.filter(conn => {
        const fromNode = Array.from(prev.nodes.values()).find(node => 
          node.outputs.some(port => port.id === conn.from)
        );
        const toNode = Array.from(prev.nodes.values()).find(node => 
          node.inputs.some(port => port.id === conn.to)
        );
        return fromNode?.id !== prev.selectedNode && toNode?.id !== prev.selectedNode;
      });

      return {
        ...prev,
        nodes: newNodes,
        connections: newConnections,
        selectedNode: null
      };
    });
    setSidebarOpen(false);
  };

  // Update node value
  const updateNodeValue = (nodeId: string, field: string, value: any) => {
    setState(prev => {
      const newNodes = new Map(prev.nodes);
      const node = newNodes.get(nodeId);
      if (node) {
        const updatedNode = { ...node, [field]: value };
        if (field === 'value' || field === 'variable') {
          updatedNode.label = value?.toString() || '';
        }
        newNodes.set(nodeId, updatedNode);
      }
      return { ...prev, nodes: newNodes };
    });
  };

  // Generate current equation
  const currentEquation = generateEquation(state.nodes, state.connections);

  // Render node
  const renderNode = (node: NodeData) => {
    const isSelected = node.id === state.selectedNode;
    const isDragging = state.dragState.nodeId === node.id;
    
    let nodeClass = `${styles.node}`;
    if (['number', 'variable'].includes(node.type)) nodeClass += ` ${styles.generator}`;
    if (['add', 'subtract', 'multiply', 'divide', 'power'].includes(node.type)) nodeClass += ` ${styles.operator}`;
    if (node.type === 'output') nodeClass += ` ${styles.output}`;
    if (isSelected) nodeClass += ` ${styles.selected}`;
    if (isDragging) nodeClass += ` ${styles.dragging}`;

    return (
      <div
        key={node.id}
        className={nodeClass}
        style={{
          left: node.position.x,
          top: node.position.y
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onClick={() => {
          setState(prev => ({ ...prev, selectedNode: node.id }));
          setSidebarOpen(true);
        }}
      >
        {node.label}
        
        {/* Input ports */}
        {node.inputs.map((port, index) => (
          <div
            key={port.id}
            className={`${styles.port} ${styles.input}`}
            style={{ top: index * 20 + 10 }}
            onClick={(e) => {
              e.stopPropagation();
              handlePortClick(port.id);
            }}
          />
        ))}
        
        {/* Output ports */}
        {node.outputs.map((port, index) => (
          <div
            key={port.id}
            className={`${styles.port} ${styles.output}`}
            style={{ top: index * 20 + 15 }}
            onClick={(e) => {
              e.stopPropagation();
              handlePortClick(port.id);
            }}
          />
        ))}
      </div>
    );
  };

  // Render connections
  const renderConnections = () => {
    return (
      <svg className={styles.connections} width="100%" height="100%">
        {state.connections.map(connection => {
          // Find port positions
          let fromPos: Position | null = null;
          let toPos: Position | null = null;

          state.nodes.forEach(node => {
            node.outputs.forEach(port => {
              if (port.id === connection.from) {
                fromPos = port.position;
              }
            });
            node.inputs.forEach(port => {
              if (port.id === connection.to) {
                toPos = port.position;
              }
            });
          });

          if (!fromPos || !toPos) return null;

          // Create curved path
          const midX = (fromPos.x + toPos.x) / 2;
          const path = `M ${fromPos.x} ${fromPos.y} Q ${midX} ${fromPos.y} ${midX} ${(fromPos.y + toPos.y) / 2} Q ${midX} ${toPos.y} ${toPos.x} ${toPos.y}`;

          return (
            <path
              key={connection.id}
              className={styles.connection}
              d={path}
            />
          );
        })}
      </svg>
    );
  };

  const selectedNode = state.selectedNode ? state.nodes.get(state.selectedNode) : null;

  return (
    <div className={styles.container}>
      {/* Node Palette */}
      <div className={styles.palette}>
        <h3 className={styles.paletteTitle}>Node Library</h3>
        {Object.entries(nodeCategories).map(([category, nodes]) => (
          <div key={category} className={styles.paletteSection}>
            <h4 className={styles.sectionTitle}>{category}</h4>
            {nodes.map(node => (
              <button
                key={node.type}
                className={styles.paletteNode}
                draggable
                onDragStart={(e) => handlePaletteNodeDragStart(e, node.type)}
              >
                {node.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className={styles.canvas}
        onDrop={handleCanvasDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Render nodes */}
        {Array.from(state.nodes.values()).map(renderNode)}
        
        {/* Render connections */}
        {renderConnections()}
        
        {/* Equation display */}
        <div className={`${styles.equation} ${!currentEquation ? styles.empty : ''}`}>
          {currentEquation || 'Connect nodes to generate equation...'}
        </div>
      </div>

      {/* Property Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>
            {selectedNode ? `Edit ${selectedNode.type}` : 'Node Properties'}
          </h3>
          <button 
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        {selectedNode && (
          <div>
            {/* Number node editor */}
            {selectedNode.type === 'number' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Value:</label>
                <input
                  type="number"
                  className={styles.input}
                  value={selectedNode.value || 0}
                  onChange={(e) => updateNodeValue(selectedNode.id, 'value', parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {/* Variable node editor */}
            {selectedNode.type === 'variable' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Variable name:</label>
                <input
                  type="text"
                  className={styles.input}
                  value={selectedNode.variable || ''}
                  onChange={(e) => updateNodeValue(selectedNode.id, 'variable', e.target.value)}
                />
              </div>
            )}

            {/* Delete button */}
            <button
              className={styles.deleteButton}
              onClick={deleteSelectedNode}
            >
              Delete Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquationBuilderV2;
