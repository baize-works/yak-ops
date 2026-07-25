export type QualityType =
  | "all"
  | "existence"
  | "consistency"
  | "completeness"
  | "standardization"
  | "sufficiency";

export type ConcreteQualityType = Exclude<QualityType, "all">;

export interface QualityPoint {
  id: string;
  title: string;
  description: string;
  documentType: string;
  type: ConcreteQualityType;
  relatedSections: string[];
  relatedElements: string[];
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 后端接口原始数据。
 *
 * 这里兼容了几种可能的字段名称。
 * 等后端接口字段确定后，可以删除不需要的兼容字段。
 */
export interface QualityPointApiItem {
  id?: string | number;
  qualityPointId?: string | number;
  code?: string;

  title?: string;
  name?: string;
  qualityPointName?: string;

  description?: string;
  qualityDescription?: string;
  remark?: string;

  documentType?: string;
  documentName?: string;
  applicableDocument?: string;

  type?: string;
  qualityType?: string;
  qualityPointType?: string;

  relatedSections?: string[] | string;
  sections?: string[] | string;
  relatedParagraphs?: string[] | string;

  relatedElements?: string[] | string;
  elements?: string[] | string;
  relatedFields?: string[] | string;

  systemPrompt?: string;
  userPrompt?: string;
}

export type QualityPointListPayload =
  | QualityPointApiItem[]
  | {
  records?: QualityPointApiItem[];
  list?: QualityPointApiItem[];
  rows?: QualityPointApiItem[];
};

export const typeLabelMap: Record<ConcreteQualityType, string> = {
  existence: "存在性",
  consistency: "一致性",
  completeness: "完整性",
  standardization: "规范性",
  sufficiency: "充分性",
};

interface QualityPointDrawerProps {
  open: boolean;
  qualityPoint: QualityPoint | null;
  onClose: () => void;
  onUpdate: (qualityPoint: QualityPoint) => Promise<void>;
}
