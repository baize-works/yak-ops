import { API_SUCCESS_CODE } from '@/services/http/response';
// import { history, useIntl } from "@umijs/max";
// import { Divider, Table, message } from "antd";
// import { TableRowSelection } from "antd/es/table/interface";
// import moment from "moment";
// import { useEffect, useMemo, useState } from "react";
// import ActionColumn from "./components/SyncTaskList/components/ActionColumn";
// import AdvancedSearchForm from "./components/SyncTaskList/components/AdvancedSearchForm";
// import { linkupJobDefinitionApi } from "./api";
// import BottomActionBar from "./components/SyncTaskList/components/BottomActionBar";
// import DataSourceSyncPlan from "./components/SyncTaskList/components/DataSourceSyncPlan";

// import Footer from "./components/SyncTaskList/components/Footer";
// import "./index.less";
// import ScheduleInfo from "./components/SyncTaskList/components/ScheduleInfo";
// import TaskStatus from "./components/SyncTaskList/components/TaskStatus";
// import { taskExecutionApi } from "./type";

// interface Props {
//   goDetail: (value: any, item?: any) => void;
// }

// const DEFAULT_TIME_RANGE = [
//   moment().subtract(4, "days"),
//   moment().add(1, "days"),
// ];

// const parseSearchParamsFromUrl = () => {
//   const params = new URLSearchParams(window.location.search);

//   const createTimeStart = params.get("createTimeStart");
//   const createTimeEnd = params.get("createTimeEnd");

//   return {
//     jobName: params.get("jobName") || undefined,
//     id: params.get("id") || undefined,
//     status: params.get("status") || undefined,
//     sourceType: params.get("sourceType") || undefined,
//     sinkType: params.get("sinkType") || undefined,
//     sourceTable: params.get("sourceTable") || undefined,
//     sinkTable: params.get("sinkTable") || undefined,
//     createTime:
//       createTimeStart && createTimeEnd
//         ? [
//             moment(createTimeStart, "YYYY-MM-DD HH:mm:ss"),
//             moment(createTimeEnd, "YYYY-MM-DD HH:mm:ss"),
//           ]
//         : DEFAULT_TIME_RANGE,
//   };
// };

// const parsePaginationFromUrl = () => {
//   const params = new URLSearchParams(window.location.search);

//   return {
//     current: Number(params.get("current") || 1),
//     pageSize: Number(params.get("pageSize") || 10),
//     total: 0,
//   };
// };

// const App: React.FC<Props> = ({ goDetail }) => {
//   const intl = useIntl();

//   const [taskList, setTaskList] = useState<any[]>([]);
//   const [searchParams, setSearchParams] = useState<any>(() =>
//     parseSearchParamsFromUrl()
//   );
//   const [pagination, setPagination] = useState(() => parsePaginationFromUrl());
//   const [loading, setLoading] = useState(false);
//   const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

//   const syncUrlParams = (
//     params: any,
//     pageInfo: { current: number; pageSize: number }
//   ) => {
//     const query = new URLSearchParams();

//     if (params?.jobName) query.set("jobName", params.jobName);
//     if (params?.id) query.set("id", params.id);
//     if (params?.status) query.set("status", params.status);
//     if (params?.sourceType) query.set("sourceType", params.sourceType);
//     if (params?.sinkType) query.set("sinkType", params.sinkType);
//     if (params?.sourceTable) query.set("sourceTable", params.sourceTable);
//     if (params?.sinkTable) query.set("sinkTable", params.sinkTable);

//     if (params?.createTime?.length === 2) {
//       query.set(
//         "createTimeStart",
//         moment(params.createTime[0]).format("YYYY-MM-DD HH:mm:ss")
//       );
//       query.set(
//         "createTimeEnd",
//         moment(params.createTime[1]).format("YYYY-MM-DD HH:mm:ss")
//       );
//     }

//     query.set("current", String(pageInfo.current || 1));
//     query.set("pageSize", String(pageInfo.pageSize || 10));

//     history.replace({
//       search: `?${query.toString()}`,
//     });
//   };

//   const fetchTaskList = async () => {
//     setLoading(true);

//     const transformedParams = { ...searchParams };

//     if (transformedParams?.createTime?.length === 2) {
//       transformedParams.createTimeStart = moment(
//         transformedParams.createTime[0]
//       ).format("YYYY-MM-DD HH:mm:ss");
//       transformedParams.createTimeEnd = moment(
//         transformedParams.createTime[1]
//       ).format("YYYY-MM-DD HH:mm:ss");
//       delete transformedParams.createTime;
//     }

//     try {
//       const data = await linkupJobDefinitionApi.page({
//         ...transformedParams,
//         current: pagination.current,
//         pageSize: pagination.pageSize,
//       });

//       setTaskList(data?.data?.bizData || []);
//       setPagination((prev) => ({
//         ...prev,
//         total: data?.data?.pagination?.total || 0,
//       }));
//     } catch (error) {
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     syncUrlParams(searchParams, pagination);
//   }, [searchParams, pagination.current, pagination.pageSize]);

//   useEffect(() => {
//     fetchTaskList();
//   }, [searchParams, pagination.current, pagination.pageSize]);

//   const menuItems = useMemo(
//     () => [
//       {
//         key: "view",
//         label: (
//           <span style={{ fontWeight: 500 }}>
//             {intl.formatMessage({
//               id: "pages.job.menu.view",
//               defaultMessage: "View",
//             })}
//           </span>
//         ),
//       },
//       {
//         key: "edit",
//         label: (
//           <span style={{ fontWeight: 500 }}>
//             {intl.formatMessage({
//               id: "pages.job.menu.edit",
//               defaultMessage: "Edit",
//             })}
//           </span>
//         ),
//       },
//       {
//         key: "delete",
//         label: (
//           <span style={{ fontWeight: 500 }}>
//             {intl.formatMessage({
//               id: "pages.job.menu.delete",
//               defaultMessage: "Delete",
//             })}
//           </span>
//         ),
//       },
//     ],
//     [intl]
//   );

//   const baseColumns = [
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.name",
//         defaultMessage: "Name",
//       }),
//       dataIndex: "jobName",
//       width: "12%",
//       ellipsis: true,
//       render: (_content: any, record: any) => (
//         <div>
//           <em style={{ fontWeight: 500 }}>
//             {intl.formatMessage({
//               id: "pages.job.table.label.jobId",
//               defaultMessage: "Job Definition ID",
//             })}
//           </em>
//           :{" "}
//           <span style={{ fontSize: "12px", color: "gray" }}>{record?.id}</span>{" "}
//           <br />
//           <em style={{ fontWeight: 500 }}>
//             {intl.formatMessage({
//               id: "pages.job.table.label.jobName",
//               defaultMessage: "JobName",
//             })}
//           </em>
//           : {record?.jobName}
//         </div>
//       ),
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.syncPlan",
//         defaultMessage: "Sync Plan",
//       }),
//       dataIndex: "",
//       width: "20%",
//       render: (_content: any, record: any) => (
//         <DataSourceSyncPlan record={record} />
//       ),
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.status",
//         defaultMessage: "Status",
//       }),
//       dataIndex: "taskParams",
//       width: "10%",
//       render: (_content: any, record: any) => (
//         <TaskStatus
//           status={record?.lastJobStatus}
//           errorMessage={record?.errorMessage}
//         />
//       ),
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.execution",
//         defaultMessage: "Execution",
//       }),
//       dataIndex: "执行概况",
//       width: "15%",
//       render: (_content: any, record: any) => (
//         <ExecutionStatus record={record} />
//       ),
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.schedule",
//         defaultMessage: "Schedule",
//       }),
//       dataIndex: "taskName",
//       width: "20%",
//       render: (_content: any, record: any) => <ScheduleInfo record={record} />,
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.createTime",
//         defaultMessage: "CreateTime",
//       }),
//       dataIndex: "createTime",
//       width: "10%",
//     },
//     {
//       title: intl.formatMessage({
//         id: "pages.job.table.col.operate",
//         defaultMessage: "Operate",
//       }),
//       dataIndex: "",
//       width: "16%",
//       fixed: "right" as const,
//       render: (record: any) => (
//         <ActionColumn
//           record={record}
//           menuItems={menuItems}
//           cbk={fetchTaskList}
//           goDetail={goDetail}
//         />
//       ),
//     },
//   ];

//   const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
//     setSelectedRowKeys(newSelectedRowKeys);
//   };

//   const rowSelection: TableRowSelection<any> = {
//     selectedRowKeys,
//     onChange: onSelectChange,
//   };

//   const handleSearch = (values: any) => {
//     setSearchParams(values);
//     setPagination((prev) => ({ ...prev, current: 1 }));
//   };

//   const handleReset = () => {
//     setSearchParams({
//       createTime: DEFAULT_TIME_RANGE,
//     });
//     setPagination((prev) => ({
//       ...prev,
//       current: 1,
//     }));
//   };

//   const handlePaginationChange = (page: number, pageSize: number) => {
//     setPagination((prev) => ({
//       ...prev,
//       current: page,
//       pageSize,
//     }));
//   };

//   const hasSelected = selectedRowKeys.length > 0;

//   const onStartAll = async () => {
//     try {
//       const data = await taskExecutionApi.batchExecute(selectedRowKeys);

//       if (data?.code === API_SUCCESS_CODE) {
//         message.success(
//           intl.formatMessage({
//             id: "pages.job.batch.start.success",
//             defaultMessage: "Start all succeeded",
//           })
//         );
//         setSelectedRowKeys([]);
//         fetchTaskList();
//       } else {
//         message.error(
//           intl.formatMessage({
//             id: "pages.job.batch.start.fail",
//             defaultMessage: "Start all failed",
//           })
//         );
//       }
//     } catch (error) {
//       message.error(
//         intl.formatMessage({
//           id: "pages.job.batch.start.fail",
//           defaultMessage: "Start all failed",
//         })
//       );
//     }
//   };

//   const onStopAll = async () => {
//     try {
//       const data = await taskExecutionApi.batchCancel(selectedRowKeys);

//       if (data?.code === API_SUCCESS_CODE) {
//         message.success(
//           intl.formatMessage({
//             id: "pages.job.batch.stop.success",
//             defaultMessage: "Stop all succeeded",
//           })
//         );
//         setSelectedRowKeys([]);
//         fetchTaskList();
//       } else {
//         message.error(
//           intl.formatMessage({
//             id: "pages.job.batch.stop.fail",
//             defaultMessage: "Stop all failed",
//           })
//         );
//       }
//     } catch (error) {
//       message.error(
//         intl.formatMessage({
//           id: "pages.job.batch.stop.fail",
//           defaultMessage: "Stop all failed",
//         })
//       );
//     }
//   };

//   return (
//     <>
//       <div
//         style={{
//           margin: "0px 16px",
//           background: "white",
//           padding: "0 16px 0 16px",
//         }}
//       >
//         <div>
//           <div className="config-manage-page">
//             <div className="operate-bar">
//               <div className="left">
//                 <AdvancedSearchForm
//                   onSearch={handleSearch}
//                   onReset={handleReset}
//                   initialValues={searchParams}
//                 />
//               </div>
//             </div>

//             <Divider style={{ margin: "0 0 24px" }} />

//             <Table
//               columns={baseColumns as any}
//               dataSource={taskList}
//               rowKey="id"
//               bordered
//               pagination={false}
//               loading={loading}
//               rowSelection={{ type: "checkbox", ...rowSelection }}
//               scroll={{ x: "max-content", y: "calc(100vh - 450px)" }}
//             />
//           </div>
//         </div>

//         {taskList && taskList.length > 1 ? "" : <Footer />}
//       </div>

//       <BottomActionBar
//         onStart={onStartAll}
//         onStop={onStopAll}
//         pagination={{
//           ...pagination,
//           onChange: handlePaginationChange,
//         }}
//         disabled={!hasSelected}
//       />
//     </>
//   );
// };

// export default App;
