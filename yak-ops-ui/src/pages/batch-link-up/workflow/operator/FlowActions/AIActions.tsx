import { Popover } from "antd";
import { useState } from "react";
import CloseIcon from "../../icon/CloseIcon";
import DeepSeekIcon from "../../icon/DeepSeekIcon";
import styles from "./index.less";
import Agent from "./Agent";

export const AIActions = ({ onBack, onRun, runVisible }: any) => {
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {};

  return (
    <>
      <Popover
        open={open}
        placement="bottomRight"
        content={
          <div className={styles["publish-popover"]} style={{ width: 800 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div
                className={styles["latest-publish"]}
                style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}
              >
                LinkUp Copilot
              </div>
              <div
                onClick={() => {
                  setOpen(false);
                }}
                style={{ cursor: "pointer" }}
              >
                <CloseIcon />
              </div>
            </div>
            <div>
              <Agent />
            </div>
          </div>
        }
      >
        <div
          className={styles["run-container"]}
          style={{
            background:
              "linear-gradient(137deg, rgb(229, 244, 255) 0%, rgb(239, 231, 255) 100%)",
          }}
          onClick={() => {
            setOpen(true);
          }}
        >
          <div
            className={styles["run-button"]}
            style={{
              width: 46,
            }}
          >
            <DeepSeekIcon />
          </div>
        </div>
      </Popover>
    </>
  );
};
