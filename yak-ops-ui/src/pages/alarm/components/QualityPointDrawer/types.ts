import type {QualityPoint} from "./model";

export interface QualityPointDrawerProps {
  open: boolean;
  qualityPoint: QualityPoint | null;
  onClose: () => void;

  /**
   * 接收编辑后的质控点。
   * 接口调用、关闭抽屉、刷新列表由父组件处理。
   */
  onUpdate: (qualityPoint: QualityPoint) => Promise<void>;
}

export type PromptTab = "system" | "user";

export type UpdateQualityPointDraft = <K extends keyof QualityPoint>(
  key: K,
  value: QualityPoint[K],
) => void;
