interface WorkflowNoteCandidateProps {
  x: number;
  y: number;
  zoom: number;
}

const WorkflowNoteCandidate = ({ x, y, zoom }: WorkflowNoteCandidateProps) => (
  <div
    className="pointer-events-none absolute z-30 flex h-[88px] w-[240px] flex-col overflow-hidden rounded-md border border-black/5 bg-[#eef6ff] shadow-[0_6px_18px_rgba(22,24,35,.10)] opacity-90"
    style={{
      left: x,
      top: y,
      transform: `scale(${zoom})`,
      transformOrigin: '0 0',
    }}
  >
    <div className="h-2 shrink-0 bg-[#4f8cff] opacity-55" />
    <div className="px-3 py-2.5 text-[12px] leading-5 text-[#98a2b3]">
      输入注释...
    </div>
  </div>
);

export default WorkflowNoteCandidate;
