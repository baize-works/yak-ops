import {ApiOutlined, ArrowLeftOutlined, LinkOutlined, SearchOutlined,} from "@ant-design/icons";
import {Alert, Button, Input, Skeleton, Tag} from "antd";
import React, {useMemo, useState} from "react";
import MethodSegmented from "./MethodSegmented";
import {HttpMethod, useOpenApiData} from "./openapi-parser";
import "./index.less";
import {history} from "umi";

type FilterMethod = "ALL" | HttpMethod;

const methodColorMap: Record<HttpMethod, string> = {
  GET: "green",
  POST: "blue",
  PUT: "orange",
  DELETE: "red",
  PATCH: "purple",
  OPTIONS: "default",
  HEAD: "default",
};

const OPEN_API_URL = "http://localhost:9527/v3/api-docs";

const ApiManagementPage: React.FC = () => {
  const {loading, error, title, description, version, controllers, apis} =
    useOpenApiData(OPEN_API_URL);

  const [activeController, setActiveController] = useState<string>("all");
  const [method, setMethod] = useState<FilterMethod>("ALL");
  const [keyword, setKeyword] = useState("");

  const currentController = useMemo(() => {
    return controllers.find((item) => item.key === activeController);
  }, [controllers, activeController]);

  const methodOptions = useMemo(() => {
    const usedMethods = Array.from(new Set(apis.map((item) => item.method)));
    return ["ALL", ...usedMethods] as FilterMethod[];
  }, [apis]);

  const filteredApis = useMemo(() => {
    return apis.filter((item) => {
      const matchController =
        activeController === "all" || item.controller === activeController;

      const matchMethod = method === "ALL" || item.method === method;

      const search = keyword.trim().toLowerCase();
      const matchKeyword =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.path.toLowerCase().includes(search) ||
        item.desc.toLowerCase().includes(search) ||
        (item.operationId || "").toLowerCase().includes(search);

      return matchController && matchMethod && matchKeyword;
    });
  }, [apis, activeController, method, keyword]);

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <div className="border-b border-[#F2F4F7] bg-white">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[20px] text-[#1570EF]">
              <ApiOutlined/>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="text-[22px] font-semibold leading-8 text-[#101828]">
                  {title || "接口管理"}
                </div>
                {version ? (
                  <div className="rounded-full bg-[#EFF8FF] px-2.5 py-1 text-[12px] font-medium text-[#1570EF]">
                    {version}
                  </div>
                ) : null}
              </div>
              <div className=" text-[14px] leading-6 text-[#667085]">
                {description || "统一查看 Controller 与接口定义"}
              </div>
            </div>
          </div>

          <Button
            type="text"
            icon={<ArrowLeftOutlined/>}
            onClick={() => {
              history.push("/data-source");
            }}
            className="!h-10 !rounded-full !border !border-[#D0D5DD] !bg-white !px-4 !text-[#344054] shadow-sm hover:!border-[#B2DDFF] hover:!text-[#1570EF]"
          >
            返回
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1540px] px-6 py-6">
        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-6 rounded-2xl"
            message="获取 OpenAPI 文档失败"
            description={error}
          />
        ) : null}

        <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div className="rounded-[28px] border border-[#EAECF0] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
            <div className="mb-4 flex items-center justify-between"
                 style={{borderBottom: "1px solid rgb(242 244 247)"}}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#1570EF]"/>
                  <div className="text-[16px] font-semibold tracking-[-0.01em] text-[#101828]">
                    Controller 列表
                  </div>
                </div>
                <div className="mt-1 pl-4 text-[13px] text-[#667085]" style={{marginBottom: 4}}>
                  共 {Math.max(controllers.length - 1, 0)} 个控制器
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({length: 6}).map((_, index) => (
                  <Skeleton.Button
                    key={index}
                    active
                    block
                    className="!h-[78px] !rounded-[20px]"
                  />
                ))}
              </div>
            ) : (
              <div
                className="space-y-2.5 controller-scroll"
                style={{
                  height: "calc(100vh - 265px)",
                  overflowY: "auto",
                }}
              >
                {controllers.map((item) => {
                  const active = item.key === activeController;

                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveController(item.key)}
                      className={[
                        "group relative cursor-pointer overflow-hidden rounded-[20px] border px-4 py-3.5 transition-all duration-200",
                        active
                          ? "border-[#B2DDFF] bg-[linear-gradient(180deg,#F8FBFF_0%,#EEF6FF_100%)] shadow-[0_6px_18px_rgba(21,112,239,0.10)]"
                          : "border-[#F2F4F7] bg-white hover:border-[#D0D5DD] hover:bg-[#FCFCFD] hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]",
                      ].join(" ")}
                    >
                      {/* 左侧强调条 */}
                      <div/>

                      <div className="flex items-start justify-between gap-3 pl-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                "truncate text-[14px] font-semibold tracking-[-0.01em] transition-colors",
                                active ? "text-[#1570EF]" : "text-[#101828]",
                              ].join(" ")}
                            >
                              {item.name}
                            </div>

                            {/* {active && (
                              <span className="inline-flex h-5 items-center rounded-full border
                               border-[#B2DDFF] bg-white px-2 text-[11px] font-medium text-[#1570EF]" style={{width: 30}}>
                                当前
                              </span>
                            )} */}
                          </div>

                          <div className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[#667085]">
                            {item.desc}
                          </div>
                        </div>

                        <div
                          className={[
                            "mt-0.5 inline-flex h-7 min-w-[34px] items-center justify-center rounded-full px-2.5 text-[12px] font-semibold transition-all",
                            active
                              ? "border border-[#D1E9FF] bg-white text-[#1570EF]"
                              : "bg-[#F2F4F7] text-[#475467] group-hover:bg-[#EAECF0]",
                          ].join(" ")}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#EAECF0] bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.04)]">
            <div
              className="flex flex-wrap items-center gap-3"
              style={{justifyContent: "space-between"}}
            >
              <div className="w-full max-w-[420px]">
                <Input
                  allowClear
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索接口名称、路径、描述"
                  prefix={<SearchOutlined className="text-[#98A2B3]"/>}
                  className="!h-9 !rounded-[26px]"
                />
              </div>

              <MethodSegmented method={method} setMethod={setMethod}/>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({length: 6}).map((_, index) => (
                  <Skeleton.Button
                    key={index}
                    active
                    block
                    className="!h-[118px] !rounded-[20px]"
                  />
                ))
              ) : filteredApis.length > 0 ? (
                filteredApis.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-[20px] border border-[#EAECF0] bg-white p-4 transition-all hover:border-[#B2DDFF] hover:bg-[#FCFEFF] hover:shadow-[0_8px_24px_rgba(21,112,239,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Tag
                            color={methodColorMap[item.method]}
                            className="!mr-0 !rounded-full !px-3 !py-[2px] !font-semibold"
                          >
                            {item.method}
                          </Tag>

                          <div className="truncate text-[15px] font-semibold text-[#101828]">
                            {item.name}
                          </div>

                          <div className="rounded-full bg-[#EFF8FF] px-2.5 py-1 text-[12px] font-medium text-[#1570EF]">
                            {controllers.find((c) => c.key === item.controller)
                              ?.name || item.controller}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[13px] text-[#475467]">
                          <LinkOutlined className="text-[#98A2B3]"/>
                          <code className="rounded-md bg-[#F8FAFC] px-2 py-1 text-[12px] text-[#344054]">
                            {item.path}
                          </code>
                        </div>

                        <div className="mt-3 text-[13px] leading-6 text-[#667085]">
                          {item.desc}
                        </div>

                        {item.operationId ? (
                          <div className="mt-2 text-[12px] text-[#98A2B3]">
                            operationId: {item.operationId}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        <Button
                          className="!h-9 !rounded-full !border-[#D0D5DD] !px-4 hover:!border-[#B2DDFF] hover:!text-[#1570EF]">
                          查看详情
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="flex h-[240px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#D0D5DD] bg-[#FCFCFD] text-center">
                  <div className="text-[16px] font-semibold text-[#101828]">
                    暂无匹配接口
                  </div>
                  <div className="mt-2 text-[13px] text-[#667085]">
                    可以试试切换 Controller、请求方式，或者修改搜索关键字
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiManagementPage;
