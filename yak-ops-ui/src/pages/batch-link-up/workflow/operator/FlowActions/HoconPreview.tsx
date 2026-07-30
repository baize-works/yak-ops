import { API_SUCCESS_CODE } from '@/services/http/response';
import { FileSearchOutlined } from "@ant-design/icons";
import { Popover, Tooltip, message } from "antd";
import { useState } from "react";

import CloseIcon from "../../icon/CloseIcon";
import CodeBlockWithCopy from "../CodeBlockWithCopy";
import { CheckListPopover } from "./CheckListPopover";
import styles from "./index.less";
import { useIntl } from "@umijs/max";

export const HoconPreview = ({ onGenerate, checkStat, checkGroups }: any) => {
  const intl = useIntl();

  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    if (checkStat.total > 0) {
      message.warning(
        intl.formatMessage({
          id: "pages.hoconPreview.resolveIssuesFirst",
          defaultMessage: "Resolve all issues first 😊",
        }),
      );
      return;
    }

    setLoading(true);
    try {
      const data = await onGenerate();
      if (data?.code === API_SUCCESS_CODE) {
        setContent(data.data);
        setOpen(true);
      } else {
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["run-container"]}>
      <Popover
        open={open}
        content={
          <div className={styles["publish-popover"]} style={{ width: 600 }}>
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
                style={{ fontWeight: 500 }}
              >
                {intl.formatMessage({
                  id: "pages.hoconPreview.title",
                  defaultMessage: "LinkUp HOCON",
                })}
              </div>

              <div
                onClick={() => setOpen(false)}
                style={{ cursor: "pointer" }}
                title={intl.formatMessage({
                  id: "pages.common.close",
                  defaultMessage: "Close",
                })}
              >
                <CloseIcon />
              </div>
            </div>

            <Tooltip
              title={intl.formatMessage({
                id: "pages.hoconPreview.tooltip",
                defaultMessage: "HOCON preview (simulated generation)",
              })}
            >
              <CodeBlockWithCopy content={content} />
            </Tooltip>
          </div>
        }
      >
        <div className={styles["history-button"]} onClick={handleClick}>
          <FileSearchOutlined />
        </div>
      </Popover>

      <div className={styles.divider}></div>

      <CheckListPopover checkStat={checkStat} checkGroups={checkGroups} />
    </div>
  );
};