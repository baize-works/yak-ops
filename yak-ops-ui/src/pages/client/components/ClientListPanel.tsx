import React from "react";
import {DeleteOutlined, EditOutlined, LinkOutlined,} from "@ant-design/icons";
import {Button, Popconfirm, Tooltip} from "antd";
import {BLUE, BORDER_COLOR} from "../constants";
import {getHealthMeta} from "../utils";

interface Props {
  clients: any[];
  selectedClientId?: number;
  onSelect: (id: number) => void;
  onEdit: (client: any) => void;
  onDelete: (client: any) => void;
  deleteLoadingId?: number;
}

const ClientListPanel: React.FC<Props> = ({
                                            clients,
                                            selectedClientId,
                                            onSelect,
                                            onEdit,
                                            onDelete,
                                            deleteLoadingId,
                                          }) => {
  return (
    <div
      style={{
        borderRight: `1px solid ${BORDER_COLOR}`,
        background: "#FCFCFD",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div className="mb-3 text-[13px] font-semibold text-[#344054]">
        Client 列表
      </div>

      <div className="flex flex-col gap-3">
        {(clients || []).map((client) => {
          const active = client.id === selectedClientId;
          const itemHealth = getHealthMeta(client.healthStatus);
          const deleting = deleteLoadingId === client.id;

          return (
            <div
              key={client.id}
              onClick={() => onSelect(client.id)}
              className={[
                "group/client relative rounded-2xl px-3.5 py-3.5",
                "cursor-pointer border transition-all duration-200 ease-out",
                active
                  ? "border-[#C7D7FE] bg-[#EEF4FF]"
                  : "border-[#EAECF0] bg-white hover:border-[#D7E1F2] hover:bg-[#FBFCFF]",
              ].join(" ")}
            >
              <div className="flex items-start gap-2.5">
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "#DFE6FF" : "#F2F4F7",
                    color: active ? BLUE : "#667085",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  <LinkOutlined/>
                </span>

                <div className="min-w-0 flex-1 pr-[52px]">
                  <div
                    className="truncate text-[14px] font-semibold"
                    style={{color: active ? BLUE : "#101828"}}
                  >
                    {client.clientName || "--"}
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-2 pl-[42px] pr-[52px] text-[12px] leading-7"
                style={{color: active ? "#5B6B8A" : "#98A2B3"}}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${itemHealth.dot}`}
                />
                {client?.remark ? (
                  <span className="truncate">{client.remark}</span>
                ) : (
                  <span className="truncate">暂无备注</span>
                )}
              </div>

              <div
                className={[
                  "absolute right-3 top-3 flex items-center gap-1",
                  "opacity-0 transition-opacity duration-200",
                  "group-hover/client:opacity-100",
                  active ? "opacity-100" : "",
                ].join(" ")}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="编辑">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined/>}
                    className="!flex !h-7 !w-7 !items-center !justify-center !rounded-lg !text-[#667085] hover:!bg-white hover:!text-[#4F5BD5]"
                    onClick={() => onEdit(client)}
                  />
                </Tooltip>

                <Popconfirm
                  title="删除 Client"
                  description="删除后不可恢复，确定要删除这个 Client 吗？"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{
                    danger: true,
                    loading: deleting,
                  }}
                  onConfirm={() => onDelete(client)}
                >
                  <Tooltip title="删除">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined/>}
                      loading={deleting}
                      className="!flex !h-7 !w-7 !items-center !justify-center !rounded-lg hover:!bg-[#FFF1F0]"
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
            </div>
          );
        })}

        {!clients?.length ? (
          <div
            className="rounded-2xl border border-dashed border-[#D8DEE6] bg-[#FBFCFE] px-4 py-5 text-[13px] leading-6 text-[#6B7280]">
            还没有 Client，先新增一个地址吧。
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClientListPanel;
