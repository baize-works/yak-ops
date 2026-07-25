import type {QualityPoint} from "./model";

export const cloneQualityPoint = (
  qualityPoint: QualityPoint,
): QualityPoint => ({
  ...qualityPoint,
  relatedSections: [...qualityPoint.relatedSections],
  relatedElements: [...qualityPoint.relatedElements],
});

export const normalizeQualityPoint = (
  qualityPoint: QualityPoint,
): QualityPoint => ({
  ...qualityPoint,
  title: qualityPoint.title.trim(),
  description: qualityPoint.description.trim(),
  documentType: qualityPoint.documentType.trim(),
  systemPrompt: qualityPoint.systemPrompt.trim(),
  userPrompt: qualityPoint.userPrompt.trim(),
  relatedSections: qualityPoint.relatedSections
    .map((item) => item.trim())
    .filter(Boolean),
  relatedElements: qualityPoint.relatedElements
    .map((item) => item.trim())
    .filter(Boolean),
});
