import type {Edge, Node, XYPosition} from 'reactflow';

export interface TransformNodeConfig {
  position: XYPosition;
  nodeType?: string;
  label: string;
  componentType: string;
  iconType?: string;
}

const createTransformData = ({
                               nodeType = 'transform',
                               label,
                               componentType,
                               iconType,
                             }: Omit<TransformNodeConfig, 'position'>) => {
  if (componentType === 'FIELDMAPPER') {
    return {
      label,
      title: label,
      description: '配置字段映射关系',
      nodeType,
      componentType,
      iconType,
      config: {
        mappings: [],
        passThroughUnmapped: true,
      },
      meta: {
        inputSchema: [],
        outputSchema: [],
        schemaStatus: 'idle',
        schemaError: '',
      },
    };
  }

  if (componentType === 'SQL') {
    return {
      label,
      title: label,
      description: '支持自定义查询逻辑',
      nodeType,
      componentType,
      iconType,
      config: {
        sql: '',
      },
      meta: {
        inputSchema: [],
        outputSchema: [],
        schemaStatus: 'idle',
        schemaError: '',
      },
    };
  }

  return {
    label,
    nodeType,
    componentType,
    iconType,
    config: {},
    meta: {
      inputSchema: [],
      outputSchema: [],
      schemaStatus: 'idle',
      schemaError: '',
    },
  };
};

export const createTransformNode = ({
                                      position,
                                      nodeType = 'transform',
                                      label,
                                      componentType,
                                      iconType,
                                    }: TransformNodeConfig): Node => {
  const id = `${nodeType}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return {
    id,
    type: 'custom',
    position,
    data: createTransformData({
      nodeType,
      label,
      componentType,
      iconType,
    }),
  };
};

export const createWorkflowEdge = (
  source: string,
  target: string,
  data?: Record<string, any>,
): Edge => ({
  id: `${source}-${target}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  source,
  target,
  type: 'custom',
  data: data || {},
});

export type InsertableTransformNode = Omit<TransformNodeConfig, 'position'> & {
  description: string;
};

export const insertableTransformNodes: InsertableTransformNode[] = [
  {
    nodeType: 'transform',
    componentType: 'FIELDMAPPER',
    iconType: 'braces',
    label: '字段映射',
    description: '配置字段对应关系',
  },
  {
    nodeType: 'transform',
    componentType: 'SQL',
    iconType: 'database',
    label: 'SQL 脚本',
    description: '支持自定义查询',
  },
];

const NODE_WIDTH = 240;
const NODE_HEIGHT = 96;
const COLUMN_GAP = 240;
const ROW_GAP = 80;

export const TRANSFORM_NODE_DROP_OFFSET = {
  x: 110,
  y: 44,
};

const getNodePriority = (node: Node) => {
  if (node.data?.nodeType === 'source') return 0;
  if (node.data?.nodeType === 'transform') return 1;
  if (node.data?.nodeType === 'sink') return 2;
  return 3;
};

const sortNodesByWorkflowRole = (nodes: Node[]) => {
  return [...nodes].sort((left, right) => {
    const priorityDiff = getNodePriority(left) - getNodePriority(right);

    if (priorityDiff !== 0) return priorityDiff;

    return left.id.localeCompare(right.id);
  });
};

export const layoutWorkflowGraph = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length <= 1) return nodes;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const incomingCount = new Map<string, number>();
  const outgoingMap = new Map<string, string[]>();

  nodes.forEach((node) => {
    incomingCount.set(node.id, 0);
    outgoingMap.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;

    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    outgoingMap.set(edge.source, [
      ...(outgoingMap.get(edge.source) || []),
      edge.target,
    ]);
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const queue = sortNodesByWorkflowRole(
    nodes.filter((node) => (incomingCount.get(node.id) || 0) === 0),
  );
  const layerMap = new Map<string, number>();

  queue.forEach((node) => {
    layerMap.set(node.id, 0);
  });

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) break;

    const currentLayer = layerMap.get(current.id) || 0;

    (outgoingMap.get(current.id) || []).forEach((targetId) => {
      layerMap.set(targetId, Math.max(layerMap.get(targetId) || 0, currentLayer + 1));
      incomingCount.set(targetId, (incomingCount.get(targetId) || 0) - 1);

      if ((incomingCount.get(targetId) || 0) === 0) {
        const targetNode = nodeById.get(targetId);

        if (targetNode) queue.push(targetNode);
      }
    });

    queue.sort((left, right) => getNodePriority(left) - getNodePriority(right));
  }

  nodes.forEach((node) => {
    if (!layerMap.has(node.id)) {
      layerMap.set(node.id, getNodePriority(node));
    }
  });

  const layers = new Map<number, Node[]>();

  sortNodesByWorkflowRole(nodes).forEach((node) => {
    const layer = layerMap.get(node.id) || 0;
    layers.set(layer, [...(layers.get(layer) || []), node]);
  });

  const layerEntries = [...layers.entries()].sort(
    ([leftLayer], [rightLayer]) => leftLayer - rightLayer,
  );
  const maxLayerSize = Math.max(
    ...layerEntries.map(([, layerNodes]) => layerNodes.length),
  );
  const canvasCenterY =
    ((maxLayerSize - 1) * (NODE_HEIGHT + ROW_GAP)) / 2 + 120;

  return nodes.map((node) => {
    const layer = layerMap.get(node.id) || 0;
    const layerNodes = layers.get(layer) || [];
    const rowIndex = layerNodes.findIndex((item) => item.id === node.id);
    const layerHeight = (layerNodes.length - 1) * (NODE_HEIGHT + ROW_GAP);

    return {
      ...node,
      position: {
        x: 100 + layer * (NODE_WIDTH + COLUMN_GAP),
        y: canvasCenterY - layerHeight / 2 + rowIndex * (NODE_HEIGHT + ROW_GAP),
      },
    };
  });
};
