import { useState } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  addEdge, 
  ConnectionMode,
  type Connection,
  type Edge,
  type NodeTypes 
} from 'reactflow';
import 'reactflow/dist/style.css';

// Define node types
const nodeTypes: NodeTypes = {
  generator: ({ data }) => (
    <div className="p-3 bg-blue-100 rounded-md border-2 border-blue-400">
      <div className="font-bold">{data.label}</div>
      <div className="text-xs">Output: {data.value}</div>
    </div>
  ),
  operator: ({ data }) => (
    <div className="p-3 bg-green-100 rounded-md border-2 border-green-400">
      <div className="font-bold">{data.label}</div>
      <div className="text-xs">Operation: {data.operation}</div>
    </div>
  )
};

// Initial nodes
const initialNodes = [
  {
    id: '1',
    type: 'generator',
    position: { x: 0, y: 0 },
    data: { label: 'Constant', value: 5 }
  },
  {
    id: '2',
    type: 'operator',
    position: { x: 200, y: 100 },
    data: { label: 'Add', operation: '+' }
  }
];

// Initial edges
const initialEdges = [];

const EquationBuilder = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onConnect = (params: Connection | Edge) => {
    setEdges((eds) => addEdge(params, eds));
  };

  return (
    <div className="w-full h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default EquationBuilder;