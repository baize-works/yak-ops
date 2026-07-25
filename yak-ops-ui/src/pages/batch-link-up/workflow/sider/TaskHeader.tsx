import { useState } from "react";
import Down from "../icon/Down";
import WorkflowSmallIcon from "../icon/WorkflowSmallIcon";
import AppIcon from "./app-icon";
import EmojiPicker from "./emoji-picker";
import "./index.less";

const TaskHeader = () => {
  const [showEmojiPicker, setShowEmojiPicker] = useState<Boolean>(false);
  const [appIcon, setAppIcon] = useState({
    type: "emoji",
    icon: "robot_face",
    background: "rgb(255, 234, 213)",
  });
  return (
    <div>
      <div style={{ flexShrink: 0 }} className="custom-title-name">
        <div style={{ position: "relative" }}>
          <div style={{ display: "block" }}>
            <div
              style={{
                padding: "0.25rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
                display: "flex",
              }}
              onClick={() => {
                setShowEmojiPicker(true);
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  marginRight: "0.5rem",
                  position: "relative",
                  height: 44,
                }}
              >
                <span
                  style={{
                    background: "rgb(255, 234, 213)",
                    fontSize: 24,
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "2.5rem",
                    height: "2.5rem",
                    position: "relative",
                  }}
                >
                  <span className="emoji-mart-emoji" data-emoji-set="native">
                    <AppIcon
                      size="large"
                      iconType={appIcon.type}
                      icon={
                        appIcon.type === "image" ? appIcon.fileId : appIcon.icon
                      }
                      background={
                        appIcon.type === "image"
                          ? undefined
                          : appIcon.background
                      }
                      imageUrl={
                        appIcon.type === "image" ? appIcon.url : undefined
                      }
                    />
                  </span>
                </span>
                <span
                  style={{
                    padding: "0.125rem",
                    backgroundColor: "#fff",
                    borderColor: "rgba(0,0,0,.02)",
                    borderWidth: "0.5px",
                    borderRadius: "0.25rem",
                    width: "1rem",
                    height: "1rem",
                    right: "-3px",
                    bottom: "-3px",
                    position: "absolute",
                    boxShadow:
                      "0 0 #0000, 0 0 #0000, 0px 1px 2px 0px rgba(16, 24, 40, .06), 0px 1px 3px 0px rgba(16, 24, 40, .1)",
                  }}
                >
                  <WorkflowSmallIcon />
                </span>
              </div>
              <div style={{ flexGrow: 1, width: 0 }}>
                <div
                  style={{
                    lineHeight: "1.25rem",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    justifyContent: "space-between",
                    alignItems: "center",
                    display: "flex",
                    color: "#354052",
                  }}
                >
                  <div
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Linkup
                  </div>
                  <Down />
                </div>
                <div
                  style={{
                    lineHeight: "18px",
                    fontWeight: 500,
                    fontSize: "10px",
                    display: "flex",
                    gap: "0.25rem",
                    color: "rgb(102 112 133)",
                    justifyContent: "left",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      paddingLeft: "0.25rem",
                      paddingRight: "0.25rem",
                      backgroundColor: "#fff",
                      borderColor: "rgba(0,0,0,.08)",
                      borderWidth: "1px",
                      borderRadius: "5px",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Batch Data Sync
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(payload) => {
            setAppIcon(payload);
            setShowEmojiPicker(false);
          }}
          onClose={() => {
            setShowEmojiPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default TaskHeader;
