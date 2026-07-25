import HttpUtils from "@/utils/HttpUtils";
import {ConcreteQualityType, QualityPoint, QualityPointApiItem, QualityPointListPayload,} from "./qualityPointTypes";

/**
 * 根据你的实际 HttpUtils 文件位置调整导入路径。
 */
export const getQualityPoints = () => {
  return HttpUtils.get<QualityPointListPayload>(
    "/api/v1/quality-points",
  );
};

export const getSegmentDicts = () => {
  return HttpUtils.get<QualityPointListPayload>(
    "/api/v1/segment-dicts",
  );
};


/**
 * 更新质控点。
 *
 * 接口暂按：
 * PUT /quality-points/{id}
 */
export const updateQualityPoint = (
  qualityPoint: QualityPoint,
) => {
  return HttpUtils.put<void>(
    `/api/v1/quality-points/${qualityPoint.id}`,
    {
      id: qualityPoint.id,
      title: qualityPoint.title,
      description: qualityPoint.description,
      documentType: qualityPoint.documentType,
      type: qualityPoint.type,
      relatedSections: qualityPoint.relatedSections,
      relatedElements: qualityPoint.relatedElements,
      systemPrompt: qualityPoint.systemPrompt,
      userPrompt: qualityPoint.userPrompt,
    },
  );
};

const qualityTypeMap: Record<string, ConcreteQualityType> = {
  existence: "existence",
  consistency: "consistency",
  completeness: "completeness",
  standardization: "standardization",
  sufficiency: "sufficiency",

  存在性: "existence",
  一致性: "consistency",
  完整性: "completeness",
  规范性: "standardization",
  充分性: "sufficiency",
};

/**
 * 将后端字符串、数组统一转换为字符串数组。
 */
const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[,，;；|]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeQualityType = (
  value: unknown,
): ConcreteQualityType | null => {
  if (typeof value !== "string") {
    return null;
  }

  return qualityTypeMap[value.trim()] ?? null;
};

/**
 * 后端字段转换为页面使用的数据结构。
 *
 * 后端字段名称发生变化时，只需要修改这里。
 */
const mapQualityPoint = (
  item: QualityPointApiItem,
  index: number,
): QualityPoint | null => {
  const type = normalizeQualityType(
    item.type ??
    item.qualityType ??
    item.qualityPointType,
  );

  if (!type) {
    console.warn("无法识别质控点类型：", item);
    return null;
  }

  const id =
    item.id ??
    item.qualityPointId ??
    item.code ??
    `quality-point-${index}`;

  return {
    id: String(id),

    title:
      item.title ??
      item.name ??
      item.qualityPointName ??
      "未命名质控点",

    description:
      item.description ??
      item.qualityDescription ??
      item.remark ??
      "",

    documentType:
      item.documentType ??
      item.documentName ??
      item.applicableDocument ??
      "未配置文书",

    type,

    relatedSections: toStringArray(
      item.relatedSections ??
      item.sections ??
      item.relatedParagraphs,
    ),

    relatedElements: toStringArray(
      item.relatedElements ??
      item.elements ??
      item.relatedFields,
    ),

    systemPrompt: item.systemPrompt ?? "",
    userPrompt: item.userPrompt ?? "",
  };
};

const extractQualityPointItems = (
  payload?: QualityPointListPayload,
): QualityPointApiItem[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.records ??
    payload.list ??
    payload.rows ??
    []
  );
};

export const normalizeQualityPoints = (
  payload?: QualityPointListPayload,
): QualityPoint[] => {
  return extractQualityPointItems(payload).flatMap(
    (item, index) => {
      const qualityPoint = mapQualityPoint(item, index);

      return qualityPoint ? [qualityPoint] : [];
    },
  );
};
