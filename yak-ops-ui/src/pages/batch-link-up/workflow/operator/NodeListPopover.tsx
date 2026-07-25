// components/NodeListPopover.tsx
import { sourceList } from "@/pages/data-source/config";
import DatabaseIcons from "@/pages/data-source/icon/DatabaseIcons";
import { SearchOutlined } from "@ant-design/icons";
import { Divider, Input, Tabs, TabsProps } from "antd";
import React from "react";
import ProcessIcon from "../icon/ProcessIcon";
import "./index.less";

interface NodeListPopoverProps {
  onNodeDragStart?: (id: any, nodeData: any) => void;
  searchText: string;
  onSearchChange: (e: any) => void;
}

export const NodeListPopover: React.FC<NodeListPopoverProps> = ({
  onNodeDragStart,
  searchText,
  onSearchChange,
}) => {
  const filterDataSource = (data: any, searchText: any) => {
    if (!searchText.trim()) return data;

    return data
      .map((group: any) => {
        const filteredList = group.datasourceList.filter(
          (item: any) =>
            item.dbType.toLowerCase().includes(searchText.toLowerCase()) ||
            item.type.toLowerCase().includes(searchText.toLowerCase())
        );

        if (filteredList.length === 0) return null;

        return {
          ...group,
          datasourceList: filteredList,
        };
      })
      .filter(Boolean);
  };

  const renderDataSourceList = (type: "source" | "sink") => (
    <div style={{ marginTop: 8 }}>
      <Input
        prefix={<SearchOutlined style={{ fontSize: "120%" }} />}
        placeholder={`Search ${type === "source" ? " Source" : " Sink"} Node`}
        onChange={onSearchChange}
        allowClear
        value={searchText}
      />
      <Divider style={{ padding: 0, margin: "8px 0" }} />

      <div
        style={{
          overflowY: "auto",
          maxWidth: 500,
          maxHeight: 500,
        }}
      >
        <div style={{ marginBottom: "0.25rem" }}>
          {filterDataSource(sourceList, searchText).map(
            (group: any, groupIndex: any) => {
              if (!group.datasourceList || group.datasourceList.length === 0) {
                return null;
              }

              return (
                <div key={groupIndex} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      color: "#666",
                      fontSize: "0.75rem",
                      lineHeight: "1rem",
                      padding: "0.25rem 0.1rem",
                      marginBottom: "0.25rem",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    {group.groupName}
                  </div>

                  <div style={{ marginBottom: "0.25rem" }}>
                    {group.datasourceList.map((item: any, itemIndex: any) => (
                      <div
                        key={`${groupIndex}-${itemIndex}`}
                        className="node-hover"
                        style={{
                          paddingLeft: "0.75rem",
                          borderRadius: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          width: "100%",
                          height: "2rem",
                        }}
                        onClick={() => {
                          if (onNodeDragStart) {
                            const id = `${type}-${Date.now()}`;
                            if (type === "source") {
                              const pluginOutput = id;
                              const nodeData = {
                                title: item?.dbType,
                                nodeType: type,
                                plugin_output: pluginOutput,
                                ...item,
                              };
                              onNodeDragStart(id, nodeData);
                            } else {
                              const pluginInput = id;
                              const nodeData = {
                                title: item?.dbType,
                                nodeType: type,
                                plugin_input: pluginInput,
                                ...item,
                              };
                              onNodeDragStart(id, nodeData);
                            }
                          }
                        }}
                      >
                        <div
                          style={{
                            marginRight: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <DatabaseIcons
                            dbType={item.dbType}
                            width="18"
                            height="16"
                          />
                        </div>
                        <div
                          style={{
                            color: "#354052",
                            fontSize: "0.875rem",
                            lineHeight: "1.25rem",
                          }}
                        >
                          {item.dbType}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "source",
      children: renderDataSourceList("source"),
    },
    {
      key: "2",
      label: "transform",
      children: (
        <div style={{ marginTop: 8 }}>
          <Input prefix={<SearchOutlined />} placeholder="Search Transform" />
          <Divider style={{ padding: 0, margin: "8px 0" }} />

          {[{ transformType: "FieldMapper", transformTitle: "FieldMapper" }].map(
            (item, index) => {
              return (
                <div
                  key={`1`}
                  className="node-hover"
                  style={{
                    paddingLeft: "0.75rem",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    width: "100%",
                    height: "2rem",
                  }}
                  onClick={() => {
                    if (onNodeDragStart) {
                      const id = `linkup-${Date.now()}`;
                      onNodeDragStart(id, {
                        nodeType: "transform",
                        title: item?.transformTitle,
                        ...{
                          onlyDiScript: false,
                          transformType: item?.transformType,
                          type: item?.transformType,
                        },
                      });
                    }
                  }}
                >
                  <div style={{ marginRight: "0.5rem" }}>
                    <div
                      style={{
                        backgroundColor: "#6172f3",
                        borderRadius: 8,
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ProcessIcon />
                    </div>
                  </div>
                  <div
                    style={{
                      color: "#354052",
                      fontSize: "0.875rem",
                      lineHeight: "1.25rem",
                    }}
                  >
                    {item?.transformType}
                  </div>
                </div>
              );
            }
          )}
        </div>
      ),
    },
    {
      key: "3",
      label: "sink",
      children: renderDataSourceList("sink"),
    },
  ];

  return (
    <div style={{ width: 260 }}>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};
