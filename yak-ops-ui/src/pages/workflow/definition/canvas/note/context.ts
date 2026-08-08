import {
  WORKFLOW_EDITOR_META_KEY,
  type WorkflowNoteSnapshot,
  type WorkflowNoteTheme,
} from './types';

interface WorkflowEditorMetaV1 {
  version: 1;
  notes?: WorkflowNoteSnapshot[];
}

const NOTE_THEMES = new Set<WorkflowNoteTheme>([
  'blue',
  'cyan',
  'green',
  'yellow',
  'pink',
  'violet',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && !Array.isArray(value) && typeof value === 'object';

const finiteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const hydrateWorkflowNotes = (
  rawInput?: Record<string, unknown>,
): WorkflowNoteSnapshot[] => {
  const rawMeta = rawInput?.[WORKFLOW_EDITOR_META_KEY];
  if (!isRecord(rawMeta) || rawMeta.version !== 1 || !Array.isArray(rawMeta.notes)) return [];

  return rawMeta.notes
    .filter(isRecord)
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `__yak_note__-${index}`,
      position: isRecord(item.position)
        ? {
            x: finiteNumber(item.position.x, 120 + index * 20),
            y: finiteNumber(item.position.y, 120 + index * 20),
          }
        : { x: 120 + index * 20, y: 120 + index * 20 },
      width: Math.max(240, finiteNumber(item.width, 240)),
      height: Math.max(88, finiteNumber(item.height, 88)),
      text: typeof item.text === 'string' ? item.text : '',
      theme: NOTE_THEMES.has(item.theme as WorkflowNoteTheme)
        ? item.theme as WorkflowNoteTheme
        : 'blue',
    }));
};

export const serializeWorkflowEditorMeta = (
  notes: WorkflowNoteSnapshot[],
): Record<string, unknown> => ({
  [WORKFLOW_EDITOR_META_KEY]: {
    version: 1,
    notes,
  } satisfies WorkflowEditorMetaV1,
});
