import { API_SUCCESS_CODE } from '@/services/http/response';
import { SyncOutlined } from "@ant-design/icons";
import { Sender, SenderProps } from "@ant-design/x";
import { Dropdown, Flex, GetRef, MenuProps, message } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { linkupCopilotApi } from "@/pages/batch-link-up/api";

import DeepSeekIcon from "../../icon/DeepSeekIcon";
import { dataSourceCatalogApi, fetchDataSourceAll, fetchDataSourcePage } from "@/pages/data-source/service";

const Switch = Sender.Switch;

type Option = { label: string; value: string };

const AgentInfo: {
  [key: string]: {
    icon: React.ReactNode;
    label: string;
    zh_label: string;
    skill: SenderProps["skill"];
    zh_skill: SenderProps["skill"];
    slotConfig: SenderProps["slotConfig"];
    zh_slotConfig: SenderProps["slotConfig"];
  };
} = {
  single_sync: {
    icon: <SyncOutlined />,
    label: "SINGLE SYNC🧠",
    zh_label: "同步助手",

    skill: { value: "SINGLE_SYNC", title: "SINGLE SYNC🧠", closable: true },
    zh_skill: { value: "SINGLE_SYNC", title: "SINGLE SYNC🧠", closable: true },

    slotConfig: [
      {
        type: "text",
        value: "Perform a single table data synchronization from [",
      },
      {
        type: "select",
        key: "source_db",
        props: {
          options: ["MySQL", "PostgreSQL", "Oracle"],
          placeholder: "select source",
        },
      },
      { type: "text", value: "." },
      {
        type: "select",
        key: "source_table",
        props: {
          options: ["users", "orders", "products"],
          placeholder: "select source table",
        },
      },
      { type: "text", value: "] to [" },
      {
        type: "select",
        key: "sink_db",
        props: { options: ["Oracle", "MySQL"], placeholder: "select sink" },
      },
      { type: "text", value: "." },
      {
        type: "input",
        key: "sink_table",
        props: { placeholder: "enter sink table" },
      },
      { type: "text", value: "]." },
    ],

    zh_slotConfig: [
      { type: "text", value: "请将 [" },
      {
        type: "select",
        key: "source_db",
        props: {
          options: ["MySQL", "PostgreSQL", "Oracle"],
          placeholder: "选择源数据库",
        },
      },
      { type: "text", value: "] 中的 [" },
      {
        type: "select",
        key: "source_table",
        props: {
          options: ["users", "orders", "products"],
          placeholder: "选择源表",
        },
      },
      { type: "text", value: "] 表，全量同步至 " },
      {
        type: "select",
        key: "sink_db",
        props: { options: ["Oracle", "MySQL"], placeholder: "选择目标数据库" },
      },
      { type: "text", value: " 的 " },
      {
        type: "input",
        key: "sink_table",
        props: { placeholder: "输入目标表名" },
      },
      { type: "text", value: " 表。" },
    ],
  },
};

function cloneAgent(agent: (typeof AgentInfo)[string]) {
  return {
    ...agent,
    // icon 是 ReactNode，保持引用即可（不要 clone）
    icon: agent.icon,

    // skill 一般是纯对象，浅拷贝足够
    skill: agent.skill ? { ...agent.skill } : agent.skill,
    zh_skill: agent.zh_skill ? { ...agent.zh_skill } : agent.zh_skill,

    // slotConfig 需要深拷贝（避免 patch/组件内部修改影响原始模板）
    slotConfig: Array.isArray(agent.slotConfig)
      ? agent.slotConfig.map((it: any) => ({
          ...it,
          props: it?.props ? { ...it.props } : it?.props,
        }))
      : agent.slotConfig,

    zh_slotConfig: Array.isArray(agent.zh_slotConfig)
      ? agent.zh_slotConfig.map((it: any) => ({
          ...it,
          props: it?.props ? { ...it.props } : it?.props,
        }))
      : agent.zh_slotConfig,
  };
}

function patchSlotConfig(
  slotConfig: any[],
  params: {
    sourceDbOptions: Array<string | Option>;
    sinkDbOptions: Array<string | Option>;
    tableOptions: string[];
    tableLoading: boolean;
  }
) {
  const { sourceDbOptions, sinkDbOptions, tableOptions, tableLoading } = params;

  return (slotConfig || []).map((item) => {
    if (item?.type === "select" && item?.key === "source_db") {
      return { ...item, props: { ...item.props, options: sourceDbOptions } };
    }
    if (item?.type === "select" && item?.key === "sink_db") {
      return { ...item, props: { ...item.props, options: sinkDbOptions } };
    }
    if (item?.type === "select" && item?.key === "source_table") {
      return {
        ...item,
        props: {
          ...item.props,
          options: tableOptions,
          loading: tableLoading,
          placeholder: tableLoading
            ? "loading tables..."
            : item?.props?.placeholder,
        },
      };
    }
    return item;
  });
}

function useDataSources() {
  const [dbOptions, setDbOptions] = useState<string[]>([]);
  const [dbNameToId, setDbNameToId] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchDataSourceAll()
      .then((res: any) => {
        if (res?.code !== API_SUCCESS_CODE) {
          
          return;
        }

        const list = res?.data || [];
        const names: string[] = list.map((v: any) => v?.dbName).filter(Boolean);

        const map: Record<string, number> = {};
        list.forEach((v: any) => {
          if (v?.dbName != null && v?.id != null)
            map[String(v.dbName)] = Number(v.id);
        });

        setDbOptions(names);
        setDbNameToId(map);
      })
      .catch((err: any) => {
        console.error(err);
        
      });
  }, []);

  return { dbOptions, dbNameToId };
}

function useTables(
  dbNameToId: Record<string, number>,
  selectedSourceDb: string
) {
  const [tablesState, setTablesState] = useState<{
    loading: boolean;
    options: string[];
  }>({
    loading: false,
    options: [],
  });

  useEffect(() => {
    const dbName = selectedSourceDb;
    if (!dbName) {
      setTablesState({ loading: false, options: [] });
      return;
    }

    const datasourceId = dbNameToId[dbName];
    if (!datasourceId) {
      setTablesState({ loading: false, options: [] });
      return;
    }

    let cancelled = false;
    setTablesState({ loading: true, options: [] });

    dataSourceCatalogApi
      .listTable(String(datasourceId))
      .then((res: any) => {
        if (cancelled) return;
        if (res?.code !== API_SUCCESS_CODE)
          throw new Error(res?.message || "Load tables failed");

        const tables: string[] = (res?.data || [])
          .map((t: any) => (typeof t === "string" ? t : t?.value ?? t?.label))
          .filter(Boolean);

        setTablesState({ loading: false, options: tables });
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error(err);
   
        setTablesState({ loading: false, options: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSourceDb, dbNameToId]);

  return {
    tableOptions: tablesState.options,
    tableLoading: tablesState.loading,
  };
}

function normalizeSlotValue(v: any): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return String(v.value ?? v.label ?? "");
  return "";
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // 1) agent 用 state：切换必更新（✅ 和你第二段一致）
  const [activeAgentKey, setActiveAgentKey] = useState("single_sync");
  const [agentConfig, setAgentConfig] = useState(() =>
    cloneAgent(AgentInfo["single_sync"])
  );

  // 2) 数据源/表
  const { dbOptions, dbNameToId } = useDataSources();
  const [selectedSourceDb, setSelectedSourceDb] = useState("");
  const { tableOptions, tableLoading } = useTables(
    dbNameToId,
    selectedSourceDb
  );

  // 3) Sender refs
  const senderRef = useRef<GetRef<typeof Sender>>(null);
  const senderZhRef = useRef<GetRef<typeof Sender>>(null);

  // 防止 Sender 内部回写/重复触发
  const lastSourceDbRef = useRef<string>("");

  // 4) 切 agent：重置状态 + 换配置（✅ 一定加载默认 slotConfig）
  const agentItemClick: MenuProps["onClick"] = (item) => {
    const nextKey = String(item.key);

    setActiveAgentKey(nextKey);
    setAgentConfig(cloneAgent(AgentInfo[nextKey]));

    // 重置与 agent 强相关的联动状态
    lastSourceDbRef.current = "";
    setSelectedSourceDb("");
    // 可选：把输入框也清一下（想要“更像默认加载”的体验）
    senderRef.current?.clear?.();
    senderZhRef.current?.clear?.();
  };

  const agentItems: MenuProps["items"] = useMemo(() => {
    return Object.keys(AgentInfo).map((k) => {
      const { icon, label } = AgentInfo[k];
      return { key: k, icon, label };
    });
  }, []);

  // 5) patch 后的 slotConfig（中英各一份）
  const patchedSlotConfig = useMemo(() => {
    return patchSlotConfig(agentConfig.slotConfig as any[], {
      sourceDbOptions: dbOptions,
      sinkDbOptions: dbOptions,
      tableOptions,
      tableLoading,
    });
  }, [agentConfig, dbOptions, tableOptions, tableLoading]);

  const patchedZhSlotConfig = useMemo(() => {
    return patchSlotConfig(agentConfig.zh_slotConfig as any[], {
      sourceDbOptions: dbOptions,
      sinkDbOptions: dbOptions,
      tableOptions,
      tableLoading,
    });
  }, [agentConfig, dbOptions, tableOptions, tableLoading]);

  // mock send
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      message.success("Send message successfully!");
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <Flex vertical gap="middle">
      <Sender
        key={`en_${activeAgentKey}`}
        loading={loading}
        ref={senderRef}
        skill={agentConfig.skill}
        placeholder="Press Enter to send message"
        slotConfig={patchedSlotConfig}
        autoSize={{ minRows: 3, maxRows: 6 }}
        suffix={false}
        onChange={(_value, _event, slots) => {
          const raw = (slots?.find((x: any) => x.key === "source_db") as any)
            ?.value;
          const sourceDb = normalizeSlotValue(raw);

          if (!sourceDb) return;
          if (sourceDb === lastSourceDbRef.current) return;

          lastSourceDbRef.current = sourceDb;
          setSelectedSourceDb(sourceDb);
        }}
        footer={(actionNode) => (
          <Flex justify="space-between" align="center">
            <Flex gap="small" align="center">
              <Dropdown
                menu={{
                  selectedKeys: [activeAgentKey],
                  onClick: agentItemClick,
                  items: agentItems,
                }}
              >
                <Switch
                  value={false}
                  icon={<DeepSeekIcon style={{ paddingTop: 4 }} />}
                  style={{ borderRadius: 12 }}
                >
                  Copilot
                </Switch>
              </Dropdown>
            </Flex>
            <Flex align="center">{actionNode}</Flex>
          </Flex>
        )}
        onSubmit={(v, _, skill) => {
          setLoading(true);
          const params = {
            prompt: `${skill?.value} | ${v}`,
            intentType: activeAgentKey,
          };
          linkupCopilotApi.copilot(params).then((data) => {
            if (data?.code === API_SUCCESS_CODE) {
              senderRef.current?.clear?.();
            } else {
              senderRef.current?.clear?.();
            }
          });
        }}
        onCancel={() => {
          setLoading(false);
          
        }}
      />
    </Flex>
  );
};

export default () => <App />;
