import {useEffect, useMemo, useState} from "react";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
  patch?: OpenApiOperation;
  options?: OpenApiOperation;
  head?: OpenApiOperation;
}

export interface OpenApiSpec {
  openapi?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  tags?: OpenApiTag[];
  paths?: Record<string, OpenApiPathItem>;
}

export interface ControllerItem {
  key: string;
  name: string;
  desc: string;
  count: number;
}

export interface ApiItem {
  id: string;
  name: string;
  path: string;
  method: HttpMethod;
  desc: string;
  controller: string;
  operationId?: string;
}

export interface ParsedOpenApiResult {
  title: string;
  description: string;
  version: string;
  controllers: ControllerItem[];
  apis: ApiItem[];
}

const METHOD_MAP: Record<string, HttpMethod> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE",
  patch: "PATCH",
  options: "OPTIONS",
  head: "HEAD",
};

function normalizeTagKey(tagName: string): string {
  return tagName || "default";
}

export function parseOpenApiSpec(spec: OpenApiSpec): ParsedOpenApiResult {
  const tagMetaMap = new Map<string, string>();
  const controllerCountMap = new Map<string, number>();
  const apis: ApiItem[] = [];

  (spec.tags || []).forEach((tag) => {
    tagMetaMap.set(normalizeTagKey(tag.name), tag.description || "");
  });

  Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
    Object.entries(pathItem || {}).forEach(([methodKey, operation]) => {
      const method = METHOD_MAP[methodKey.toLowerCase()];
      if (!method || !operation) return;

      const rawTags =
        operation.tags && operation.tags.length > 0
          ? operation.tags
          : ["default"];

      const controllerName = normalizeTagKey(rawTags[0]);

      controllerCountMap.set(
        controllerName,
        (controllerCountMap.get(controllerName) || 0) + 1
      );

      apis.push({
        id: `${method}-${path}-${operation.operationId || ""}`,
        name:
          operation.summary ||
          operation.operationId ||
          "未命名接口",
        path,
        method,
        desc: operation.description || operation.summary || "暂无描述",
        controller: controllerName,
        operationId: operation.operationId,
      });
    });
  });

  const controllers: ControllerItem[] = [
    {
      key: "all",
      name: "全部 Controller",
      desc: "查看所有接口",
      count: apis.length,
    },
    ...Array.from(controllerCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        key: name,
        name,
        desc: tagMetaMap.get(name) || "OpenAPI 自动解析分组",
        count,
      })),
  ];

  return {
    title: spec.info?.title || "接口管理",
    description:
      spec.info?.description || "统一查看 Controller 与接口定义",
    version: spec.info?.version || "",
    controllers,
    apis,
  };
}

export function useOpenApiData(url: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`);
        }

        const json = await response.json();
        if (!active) return;
        setSpec(json);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "获取 OpenAPI 文档失败");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [url]);

  const parsed = useMemo(() => {
    if (!spec) {
      return {
        title: "接口管理",
        description: "",
        version: "",
        controllers: [],
        apis: [],
      };
    }
    return parseOpenApiSpec(spec);
  }, [spec]);

  return {
    loading,
    error,
    rawSpec: spec,
    ...parsed,
  };
}
