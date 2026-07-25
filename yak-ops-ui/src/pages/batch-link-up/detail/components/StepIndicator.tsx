import {STEP_THEME} from "../constants";
import type {StepKey} from "../types";

interface Props {
  activeStep: StepKey;
}

const StepIndicator: React.FC<Props> = ({activeStep}) => {
  return (
    <div className="sticky top-0 z-20 mb-6 bg-white/95 pt-1 backdrop-blur">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
            activeStep === "base"
              ? STEP_THEME.base.pill
              : STEP_THEME.base.pillInactive,
          ].join(" ")}
        >
          <span
            className={[
              "flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200",
              activeStep === "base"
                ? STEP_THEME.base.dot
                : STEP_THEME.base.dotInactive,
            ].join(" ")}
          >
            1
          </span>
          基础配置
        </div>

        <div className="h-px flex-1 bg-[#EAECF0]"/>

        <div
          className={[
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
            activeStep === "client"
              ? STEP_THEME.client.pill
              : STEP_THEME.client.pillInactive,
          ].join(" ")}
        >
          <span
            className={[
              "flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200",
              activeStep === "client"
                ? STEP_THEME.client.dot
                : STEP_THEME.client.dotInactive,
            ].join(" ")}
          >
            2
          </span>
          客户端链接配置
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
