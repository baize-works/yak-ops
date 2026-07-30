import { API_SUCCESS_CODE } from '@/services/http/response';
import HttpUtils from '@/utils/HttpUtils';
import { Client } from '@stomp/stompjs';
import type { TabsProps } from 'antd';
import { Button, Card, Divider, List, message, Progress, Tabs, Tag } from 'antd';
import type { FC } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import CloseIcon from '../icon/CloseIcon';
import './index.less';



type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';
type NodeStatus = 'pending' | 'running' | 'succeeded' | 'failed';

interface NodeExecutionInfo {
  id: string;
  nodeId: string;
  nodeType: string;
  title: string;
  status: NodeStatus;
  startTime?: number;
  endTime?: number;
  elapsedTime?: number;
  inputs?: any;
  outputs?: any;
  error?: string;
}

interface ExecutionState {
  status: ExecutionStatus;
  progress: number;
  logs: string[];
  processId?: string;
  result?: any;
  nodes: Record<string, NodeExecutionInfo>;
  workflowRunId?: string;
  error?: string;
}

interface WebSocketMessage {
  event: string;
  workflow_run_id: string;
  data: any;
}

interface WorkflowRunPanelProps {
  onClose: () => void;
  workflowId: string;
  onNodeDataChange: (nodeId: string, status: string, error?: string) => void;
  handleExecutionStart: () => void;
  onWebSocketMessage: (edgeId: string, status: string) => void;
}

const WorkflowRunPanel: FC<WorkflowRunPanelProps> = ({
  onClose,
  workflowId,
  onNodeDataChange,
  handleExecutionStart,
  onWebSocketMessage,
}) => {
  const [execution, setExecution] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    logs: [],
    nodes: {},
  });
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [websocketConnected, setWebsocketConnected] = useState(false);

  const addLog = useCallback((log: string) => {
    setExecution((prev) => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${log}`],
    }));
  }, []);

  const calculateProgress = useCallback((nodes: Record<string, NodeExecutionInfo>) => {
    const nodeList = Object.values(nodes);
    if (nodeList.length === 0) return 0;

    const completedNodes = nodeList.filter(
      (n) => n.status === 'succeeded' || n.status === 'failed',
    ).length;

    return Math.round((completedNodes / nodeList.length) * 100);
  }, []);

  const connectWebSocket = useCallback(() => {
    const socket = new SockJS('http://localhost:9529/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        setWebsocketConnected(true);
        message.success('WebSocket连接成功');
        addLog('WebSocket连接成功');

        client.subscribe(`/topic/workflow/${workflowId}`, (msg) => {
          try {
            const messageData: WebSocketMessage = JSON.parse(msg.body);

            switch (messageData.event) {
              case 'workflow_started':
                handleWorkflowStarted(messageData);
                break;
              case 'node_started':
                handleNodeStarted(messageData);
                break;
              case 'node_finished':
                handleNodeFinished(messageData);
                break;
              case 'workflow_finished':
                handleWorkflowFinished(messageData);
                break;
              default:
                addLog(`未知事件类型: ${messageData.event}`);
                break;
            }
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error);
            addLog('解析 WebSocket 消息失败');
          }
        });
      },

      onDisconnect: () => {
        setWebsocketConnected(false);
        message.warning('WebSocket连接断开');
        addLog('WebSocket连接断开');
      },

      onStompError: (frame) => {
        message.error('WebSocket连接错误: ' + frame.headers.message);
        addLog('WebSocket连接错误: ' + frame.headers.message);
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [workflowId, addLog]);

  const handleWorkflowStarted = useCallback((message: WebSocketMessage) => {
    const { workflow_run_id, data } = message;

    setExecution((prev) => ({
      ...prev,
      status: 'running',
      workflowRunId: workflow_run_id,
      logs: [
        ...prev.logs,
        `工作流开始执行 (ID: ${workflow_run_id})`,
        `输入参数: ${JSON.stringify(data.inputs)}`,
      ],
    }));
  }, []);

  const handleNodeStarted = (message: WebSocketMessage) => {
    const { data } = message;

    setExecution((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [data.node_id]: {
          ...(prev.nodes[data.node_id] || {}),
          status: 'running',
          startTime: Date.now(),
        },
      },
      logs: [...prev.logs, `节点 [${data.title}] 开始执行`],
    }));

    onNodeDataChange(data.node_id, 'running', '');
    onWebSocketMessage(data?.edge_id, 'running');
  };

  const handleNodeFinished = useCallback(
    (message: WebSocketMessage) => {
      const { data } = message;
      const nodeStatus = data.status === 'succeeded' ? 'succeeded' : 'failed';

      setExecution((prev) => {
        const updatedNodes = {
          ...prev.nodes,
          [data.node_id]: {
            ...prev.nodes[data.node_id],
            status: nodeStatus,
            endTime: data.finished_at,
            elapsedTime: data.elapsed_time,
            outputs: data.outputs,
            error: data.error,
          },
        };

        const nodeTitle = data.title || `节点 ${data.node_id}`;
        const logMessage =
          nodeStatus === 'succeeded'
            ? `节点 [${nodeTitle}] 执行成功 (耗时: ${data.elapsed_time?.toFixed(3)}s)`
            : `节点 [${nodeTitle}] 执行失败: ${data.error}`;

        return {
          ...prev,
          nodes: updatedNodes,
          logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${logMessage}`],
          progress: calculateProgress(updatedNodes),
        };
      });

      onNodeDataChange(data.node_id, nodeStatus, '');
      onWebSocketMessage(data?.edge_id, nodeStatus);
      // if (onNodeStatusChange) {
      //   onNodeStatusChange(data.node_id, nodeStatus, data.error);
      // }
    },
    [calculateProgress],
  );

  const handleWorkflowFinished = useCallback((msg: WebSocketMessage) => {
    const { data } = msg;
    const workflowStatus = data.status === 'succeeded' ? 'completed' : 'failed';

    setExecution((prev) => ({
      ...prev,
      status: workflowStatus,
      progress: 100,
      result: data.outputs,
      error: data.error,
      logs: [
        ...prev.logs,
        `${new Date().toLocaleTimeString()}: 工作流执行${
          workflowStatus === 'completed' ? '成功' : '失败'
        }`,
        `${new Date().toLocaleTimeString()}: 总耗时: ${data.elapsed_time?.toFixed(3)}秒`,
      ],
    }));

    if (workflowStatus === 'completed') {
      message.success('工作流执行完成');
    } else {
      message.error(data.error || '工作流执行失败');
    }
  }, []);

  const executeWorkflow = useCallback(async () => {
    if (!websocketConnected) {
      message.warning('正在建立WebSocket连接，请稍候...');
      return;
    }

    setExecution({
      status: 'idle',
      progress: 0,
      logs: [`${new Date().toLocaleTimeString()}: 准备执行工作流...`],
      nodes: {},
      workflowRunId: undefined,
    });

    try {
      const response = await HttpUtils.get(`/api/workflow/execute/${workflowId}`);

      if (response?.code === API_SUCCESS_CODE) {
        message.success('工作流执行请求已发送');
        addLog('工作流执行请求已发送');
      } else {
        setExecution((prev) => ({
          ...prev,
          status: 'failed',
          error: response?.msg || '未知错误',
          logs: [
            ...prev.logs,
            `${new Date().toLocaleTimeString()}: 执行请求失败 - ${response?.msg || '未知错误'}`,
          ],
        }));
        
      }
    } catch (error: any) {
      setExecution((prev) => ({
        ...prev,
        status: 'failed',
        error: error.message,
        logs: [...prev.logs, `${new Date().toLocaleTimeString()}: 网络错误 - ${error.message}`],
      }));
      
    }
  }, [websocketConnected, workflowId, addLog]);

  const renderNodeStatus = useCallback((node: NodeExecutionInfo) => {
    const statusConfig = {
      pending: { color: 'default', text: '等待中' },
      running: { color: 'processing', text: '执行中' },
      succeeded: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
    };

    const { color, text } = statusConfig[node.status] || statusConfig.pending;

    return <Tag color={color}>{text}</Tag>;
  }, []);

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '控制台',
      children: (
        <div>
          <Button
            onClick={executeWorkflow}
            style={{ width: '100%' }}
            type="primary"
            loading={execution.status === 'running'}
            disabled={execution.status === 'running' || !websocketConnected}
          >
            {execution.status === 'running'
              ? '执行中...'
              : !websocketConnected
              ? '正在连接...'
              : '开始运行'}
          </Button>

          {execution.status !== 'idle' && (
            <Card style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                连接状态:{' '}
                <Tag color={websocketConnected ? 'success' : 'error'}>
                  {websocketConnected ? '已连接' : '未连接'}
                </Tag>
              </div>
              <Progress
                percent={execution.progress}
                status={
                  execution.status === 'failed'
                    ? 'exception'
                    : execution.status === 'completed'
                    ? 'success'
                    : 'active'
                }
              />
              <List
                size="small"
                bordered
                dataSource={execution.logs}
                renderItem={(item) => <List.Item>{item}</List.Item>}
                style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto' }}
              />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: '节点状态',
      children: (
        <List
          dataSource={Object.values(execution.nodes)}
          renderItem={(node) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{node.title}</strong> ({node.nodeType})
                  </span>
                  {renderNodeStatus(node)}
                </div>
                {node.elapsedTime && (
                  <div style={{ marginTop: 4 }}>耗时: {node.elapsedTime.toFixed(3)}秒</div>
                )}
                {node.status === 'failed' && node.error && (
                  <div style={{ marginTop: 4, color: 'red' }}>错误: {node.error}</div>
                )}
              </div>
            </List.Item>
          )}
        />
      ),
    },
    {
      key: '3',
      label: '执行结果',
      children:
        execution.status === 'completed' ? (
          <pre>{JSON.stringify(execution.result || '暂无结果', null, 2)}</pre>
        ) : execution.status === 'failed' ? (
          <div style={{ color: 'red' }}>{execution.error}</div>
        ) : (
          <div>工作流尚未完成执行</div>
        ),
    },
    {
      key: '4',
      label: '详细日志',
      children: (
        <List
          header={<div>执行日志</div>}
          bordered
          dataSource={execution.logs}
          renderItem={(item) => <List.Item>{item}</List.Item>}
          style={{ maxHeight: 400, overflowY: 'auto' }}
        />
      ),
    },
  ];

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => {
      cleanup?.();
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [connectWebSocket]);

  return (
    <div className="workflowPanel">
      <div className="workflowPanel-container">
        <div className="workflowPanel-header">
          <div className="workflowPanel-headerContent">
            <div className="workflowPanel-titleInput" style={{ fontSize: '17px' }}>
              工作流执行面板
            </div>
            <div className="workflowPanel-actions">
              <Divider type="vertical" style={{ margin: '0 4px' }} />
              <div className="workflowPanel-actionButton" onClick={onClose}>
                <CloseIcon />
              </div>
            </div>
          </div>
          <div style={{ padding: '0 22px' }}>
            <Tabs defaultActiveKey="1" items={items} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(WorkflowRunPanel);
