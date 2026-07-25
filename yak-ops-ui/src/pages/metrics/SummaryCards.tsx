import React from "react";
import {useIntl} from "@umijs/max";
import {SummaryData} from "./types";

interface SummaryCardsProps {
  summaryData: SummaryData;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({summaryData}) => {
  const intl = useIntl();

  const cards = [
    {
      title: intl.formatMessage({
        id: "pages.job.summary.totalSyncs",
        defaultMessage: "Total Syncs",
      }),
      value: summaryData.totalRecords,
      unit: summaryData.totalRecordsUnit || "-",
    },
    {
      title: intl.formatMessage({
        id: "pages.job.summary.totalSyncVolume",
        defaultMessage: "Total Sync Volume",
      }),
      value: summaryData.totalBytes,
      unit: summaryData.totalBytesUnit || "-",
    },
    {
      title: intl.formatMessage({
        id: "pages.job.summary.totalExecutions",
        defaultMessage: "Total Executions",
      }),
      value: summaryData.totalTasks,
      unit: intl.formatMessage({
        id: "pages.job.summary.unit.times",
        defaultMessage: "times",
      }),
    },
    {
      title: intl.formatMessage({
        id: "pages.job.summary.successExecutions",
        defaultMessage: "Successful Executions",
      }),
      value: summaryData.successTasks,
      unit: intl.formatMessage({
        id: "pages.job.summary.unit.times",
        defaultMessage: "times",
      }),
    },
  ];

  return (
    <div
      style={{
        margin: "16px 16px 0 16px",
        padding: 12,
        background: "white",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "nowrap",
          width: "100%",
        }}
      >
        {cards.map((item, index) => (
          <div key={index} style={{flex: "1", width: "100%"}}>
            <div className="css-1qqgizd">
              <div className="title">{item.title}</div>
              <div className="big-number">{item.value || 0}</div>
              <div>
                <div className="small-number">
                  {intl.formatMessage({
                    id: "pages.job.summary.unit.label",
                    defaultMessage: "Unit",
                  })}
                  : {item.unit}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
