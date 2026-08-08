import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface WorkflowCanvasHistoryEntry<T> {
  id: number;
  label: string;
  createdAt: number;
  snapshot: T;
}

interface UseWorkflowCanvasHistoryOptions<T> {
  snapshot: T;
  historyKey: string;
  enabled: boolean;
  onRestore: (snapshot: T) => void;
  debounceMs?: number;
  maxEntries?: number;
}

const cloneSnapshot = <T,>(snapshot: T): T =>
  JSON.parse(JSON.stringify(snapshot)) as T;

const useWorkflowCanvasHistory = <T,>({
  snapshot,
  historyKey,
  enabled,
  onRestore,
  debounceMs = 280,
  maxEntries = 50,
}: UseWorkflowCanvasHistoryOptions<T>) => {
  const [entries, setEntries] = useState<Array<WorkflowCanvasHistoryEntry<T>>>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const pendingLabelRef = useRef('工作流已修改');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const initializedKeyRef = useRef<string>();
  const restoringRef = useRef(false);
  const sequenceRef = useRef(1);
  const lastSerializedRef = useRef('');

  const serializedSnapshot = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const reset = useCallback((nextSnapshot: T) => {
    cancelPending();
    const nextEntry: WorkflowCanvasHistoryEntry<T> = {
      id: sequenceRef.current++,
      label: '会话开始',
      createdAt: Date.now(),
      snapshot: cloneSnapshot(nextSnapshot),
    };
    setEntries([nextEntry]);
    setCurrentIndex(0);
    pendingLabelRef.current = '工作流已修改';
    lastSerializedRef.current = JSON.stringify(nextSnapshot);
  }, [cancelPending]);

  useEffect(() => {
    if (!enabled) return;

    if (initializedKeyRef.current !== historyKey) {
      initializedKeyRef.current = historyKey;
      reset(snapshot);
      return;
    }

    if (restoringRef.current) {
      restoringRef.current = false;
      lastSerializedRef.current = serializedSnapshot;
      return;
    }

    if (serializedSnapshot === lastSerializedRef.current) return;

    cancelPending();
    timerRef.current = setTimeout(() => {
      const label = pendingLabelRef.current || '工作流已修改';
      const nextSnapshot = cloneSnapshot(snapshot);

      setEntries((current) => {
        const keepThrough = Math.max(0, currentIndex + 1);
        const base = current.slice(0, keepThrough);
        const next = [
          ...base,
          {
            id: sequenceRef.current++,
            label,
            createdAt: Date.now(),
            snapshot: nextSnapshot,
          },
        ];
        const trimmed = next.slice(Math.max(0, next.length - maxEntries));
        setCurrentIndex(trimmed.length - 1);
        return trimmed;
      });

      lastSerializedRef.current = serializedSnapshot;
      pendingLabelRef.current = '工作流已修改';
      timerRef.current = undefined;
    }, debounceMs);

    return cancelPending;
  }, [
    cancelPending,
    currentIndex,
    debounceMs,
    enabled,
    historyKey,
    maxEntries,
    reset,
    serializedSnapshot,
    snapshot,
  ]);

  const mark = useCallback((label: string) => {
    pendingLabelRef.current = label;
  }, []);

  const restoreAt = useCallback((index: number) => {
    const entry = entries[index];
    if (!entry || index === currentIndex) return;

    cancelPending();
    restoringRef.current = true;
    pendingLabelRef.current = '工作流已修改';
    lastSerializedRef.current = JSON.stringify(entry.snapshot);
    setCurrentIndex(index);
    onRestore(cloneSnapshot(entry.snapshot));
  }, [cancelPending, currentIndex, entries, onRestore]);

  const undo = useCallback(() => {
    if (currentIndex <= 0) return;
    restoreAt(currentIndex - 1);
  }, [currentIndex, restoreAt]);

  const redo = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= entries.length - 1) return;
    restoreAt(currentIndex + 1);
  }, [currentIndex, entries.length, restoreAt]);

  const clear = useCallback(() => {
    cancelPending();
    const nextEntry: WorkflowCanvasHistoryEntry<T> = {
      id: sequenceRef.current++,
      label: '当前状态',
      createdAt: Date.now(),
      snapshot: cloneSnapshot(snapshot),
    };
    setEntries([nextEntry]);
    setCurrentIndex(0);
    pendingLabelRef.current = '工作流已修改';
    lastSerializedRef.current = serializedSnapshot;
  }, [cancelPending, serializedSnapshot, snapshot]);

  return {
    entries,
    currentIndex,
    canUndo: currentIndex > 0,
    canRedo: currentIndex >= 0 && currentIndex < entries.length - 1,
    mark,
    undo,
    redo,
    jumpTo: restoreAt,
    clear,
  };
};

export default useWorkflowCanvasHistory;
