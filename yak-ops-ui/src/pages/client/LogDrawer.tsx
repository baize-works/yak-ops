// src/pages/devops/multi-cluster/LogDrawer.tsx
import {forwardRef, useImperativeHandle, useState} from "react";
import {Drawer, Empty} from "antd";
import "./index.less";

export interface LogDrawerRef {
  setVisible: (status: boolean, content?: string, title?: string) => void;
}

const LogDrawer = forwardRef<LogDrawerRef>((_, ref) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("查看日志");

  useImperativeHandle(ref, () => ({
    setVisible: (status: boolean, logContent?: string, drawerTitle?: string) => {
      setContent(logContent || "");
      setTitle(drawerTitle || "查看日志");
      setVisible(status);
    },
  }));

  return (
    <Drawer
      title={title}
      open={visible}
      onClose={() => {
        setVisible(false);
      }}
      height="73vh"
      placement="bottom"
      destroyOnClose
    >
      {content ? (
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: 1.7,
            background: "#0b1220",
            color: "#d7e3ff",
            padding: 16,
            borderRadius: 8,
            maxHeight: "calc(73vh - 120px)",
            overflow: "auto",
          }}
        >
          {content}
        </pre>
      ) : (
        <Empty description="暂无日志内容"/>
      )}
    </Drawer>
  );
});

export default LogDrawer;
