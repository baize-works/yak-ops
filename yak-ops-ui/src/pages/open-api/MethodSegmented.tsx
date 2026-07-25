import React from "react";
import {Segmented} from "antd";
import {ArrowDownToLine, ArrowUpFromLine, PencilLine, Trash2, Waypoints,} from "lucide-react";
import "./index.less"

type FilterMethod = "ALL" | "GET" | "POST" | "PUT" | "DELETE";

interface MethodSegmentedProps {
  method: FilterMethod;
  setMethod: (value: FilterMethod) => void;
}

const MethodSegmented: React.FC<MethodSegmentedProps> = ({
                                                           method,
                                                           setMethod,
                                                         }) => {
  return (
    <Segmented
      value={method}
      onChange={(value) => setMethod(value as FilterMethod)}
      className="method-segmented"
      options={[
        {
          label: (
            <div className="method-option">
              <Waypoints size={14}/>
              <span className="method-option__title">全部</span>
            </div>
          ),
          value: "ALL",
        },
        {
          label: (
            <div className="method-option">
              <ArrowDownToLine size={14}/>
              <span className="method-option__title">GET</span>
            </div>
          ),
          value: "GET",
        },
        {
          label: (
            <div className="method-option">
              <ArrowUpFromLine size={14}/>
              <span className="method-option__title">POST</span>
            </div>
          ),
          value: "POST",
        },
        {
          label: (
            <div className="method-option">
              <PencilLine size={14}/>
              <span className="method-option__title">PUT</span>
            </div>
          ),
          value: "PUT",
        },
        {
          label: (
            <div className="method-option">
              <Trash2 size={14}/>
              <span className="method-option__title">DELETE</span>
            </div>
          ),
          value: "DELETE",
        },
      ]}
    />
  );
};

export default MethodSegmented;
