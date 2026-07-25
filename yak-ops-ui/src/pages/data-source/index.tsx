import ClickSpark from "@/components/ClickSpark";
import {useIntl} from "@umijs/max";
import {message, Modal, Spin} from "antd";
import {motion} from "framer-motion";
import React, {useEffect, useMemo, useRef, useState} from "react";
import AddOrEditDataSourceModal from "./components/AddOrEditDataSourceModal";
import DataSourceCard from "./components/DataSourceCard";
import EmptyState from "./components/EmptyState";
import PageHeader from "./components/PageHeader";
import SearchBar from "./components/SearchBar";
import {PAGE_ANIMATION, PAGE_DEFAULT_PAGINATION} from "./constants";
import "./index.less";
import {deleteDataSource, fetchDataSourcePage, testDataSourceConnection,} from "./service";
import type {
  DataSourceModalRef,
  DataSourceOperateType,
  DataSourcePageParams,
  DataSourceRecord,
  PaginationInfo,
} from "./types";
import {filterDataSourceList} from "./utils";

const {confirm} = Modal;

const DataSourcePage: React.FC = () => {
  const intl = useIntl();
  const modalRef = useRef<DataSourceModalRef>(null);

  const [loading, setLoading] = useState(false);
  const [dataSourceList, setDataSourceList] = useState<DataSourceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>(
    PAGE_DEFAULT_PAGINATION
  );
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchList = async (params?: Partial<DataSourcePageParams>) => {
    try {
      setLoading(true);

      const requestParams: DataSourcePageParams = {
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        ...params,
      };

      const response = await fetchDataSourcePage(requestParams);

      if (response.code !== 0) {

        return;
      }

      setDataSourceList(response.data?.bizData || []);
      setPagination(response.data?.pagination || PAGE_DEFAULT_PAGINATION);
    } catch (error: any) {

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDataSourceList = useMemo(() => {
    return filterDataSourceList(dataSourceList, searchKeyword);
  }, [dataSourceList, searchKeyword]);

  const handleRefresh = () => {
    fetchList();
  };

  const handleCreate = () => {
    modalRef.current?.open({
      operateType: "CREATE" as DataSourceOperateType,
      onSuccess: handleRefresh,
    });
  };

  const handleEdit = (record: DataSourceRecord) => {
    modalRef.current?.open({
      operateType: "EDIT" as DataSourceOperateType,
      currentRecord: record,
      onSuccess: handleRefresh,
    });
  };

  const handleDelete = (record: DataSourceRecord) => {
    confirm({
      title: intl.formatMessage({
        id: "pages.datasource.delete.confirmTitle",
        defaultMessage: "Are you sure you want to delete it ?",
      }),
      centered: true,
      content: (
        <span>
          {intl.formatMessage(
            {
              id: "pages.datasource.delete.confirmContentLine1",
              defaultMessage: "Are you sure you delete datasource [{name}] ?",
            },
            {
              name: <span style={{color: "orange"}}>{record.name}</span>,
            }
          )}
          <br/>
          {intl.formatMessage({
            id: "pages.datasource.delete.confirmContentLine2",
            defaultMessage:
              "Once a data source is deleted, it cannot be recovered. Please proceed with caution.",
          })}
        </span>
      ),
      okText: intl.formatMessage({
        id: "pages.datasource.delete.okText",
        defaultMessage: "Delete",
      }),
      okType: "primary",
      okButtonProps: {
        size: "small",
        danger: true,
      },
      cancelButtonProps: {
        size: "small",
      },
      maskClosable: true,
      async onOk() {
        if (!record.id) {
          message.error(
            intl.formatMessage({
              id: "pages.datasource.message.idNotExist",
              defaultMessage: "id does not exist",
            })
          );
          return;
        }

        try {
          const response = await deleteDataSource(record.id);

          if (response.code !== 0) {

            return;
          }

          message.success(response.message || "Delete success");
          handleRefresh();
        } catch (error: any) {

        }
      },
    });
  };

  const handleTestConnection = async (record: DataSourceRecord) => {
    if (!record.id) {
      message.error(
        intl.formatMessage({
          id: "pages.datasource.message.unknownError",
          defaultMessage: "Unknown error",
        })
      );
      return;
    }

    try {
      await testDataSourceConnection(record.id);

      message.success(
        intl.formatMessage({
          id: "pages.datasource.message.connectSuccess",
          defaultMessage: "Connected Success",
        })
      );

      handleRefresh();
    } catch (_) {
    }
  };

  return (
    <>
      <ClickSpark
        sparkColor="hsl(231 48% 48%)"
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
        easing="ease-out"
        extraScale={1}
      >
        <div className="datasource-page-container">
          <div className="datasource-page-content">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={PAGE_ANIMATION.sectionStagger}
            >
              <motion.div variants={PAGE_ANIMATION.fadeUp}>
                <PageHeader onCreate={handleCreate}/>
              </motion.div>

              <motion.div variants={PAGE_ANIMATION.fadeUp}>
                <SearchBar value={searchKeyword} onChange={setSearchKeyword}/>
              </motion.div>

              <motion.p
                variants={PAGE_ANIMATION.fadeUp}
                className="datasource-page-count"
              >
                发现 {filteredDataSourceList.length} 个数据源
              </motion.p>

              <Spin spinning={loading}>
                <motion.div
                  variants={PAGE_ANIMATION.cardStagger}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="grid grid-cols-[repeat(auto-fill,440px)] justify-start gap-5">
                    {filteredDataSourceList.map((record) => (
                      <motion.div
                        key={record.id}
                        variants={PAGE_ANIMATION.fadeUp}
                      >
                        <DataSourceCard
                          record={record}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onTestConnection={handleTestConnection}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {!loading && filteredDataSourceList.length === 0 && (
                    <EmptyState onCreate={handleCreate}/>
                  )}
                </motion.div>
              </Spin>
            </motion.div>
          </div>
        </div>
      </ClickSpark>

      <AddOrEditDataSourceModal ref={modalRef}/>
    </>
  );
};

export default DataSourcePage;
