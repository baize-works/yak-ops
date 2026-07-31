import {Card} from "antd";
import React from "react";


const HoconTab: React.FC<any> = ({config = ""}) => {
  return (
    <Card
      size="small"
      style={{borderWidth: 0}}
      className="mt-2  !shadow-[0_0_0_rgba(15,23,42,0.04)]"
      bodyStyle={{borderWidth: 0, padding: 0, marginBottom: 116}}
    >
      <div className="overflow-hidden  bg-[#FCFDFE]">
        <div className="">
          
        </div>
      </div>
    </Card>
  );
};

export default HoconTab;
