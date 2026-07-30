import { API_SUCCESS_CODE } from '@/services/http/response';
import api from "@/api";
import HttpUtils from "@/utils/HttpUtils";
import { message } from "antd";
import { useState } from "react";

// 处理数据源相关逻辑
 const useDataSource = (initialType) => {
  const [type, setType] = useState(initialType);
  const [sources, setSources] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);

  const fetchSources = async (type) => {
    // 获取数据源逻辑
    HttpUtils.post(api.datasource + '/select', {
      type: value?.toLocaleUpperCase(),
    }).then((data) => {
      if (data?.code === API_SUCCESS_CODE) {
        setSources(data?.data);
      } else {
        message.error(data?.message);
      }
    });
  };

  const fetchDatabases = async (sourceId) => {
    // 获取数据库逻辑
  };




  const fetchTables = async (sourceId, database) => {
    // 获取表逻辑
  };

  const fetchColumns = async (sourceId, database, table) => {
    // 获取列逻辑
  };

  return {
    type,
    setType,
    sources,
    databases,
    tables,
    columns,
    fetchSources,
    fetchDatabases,
    fetchTables,
    fetchColumns
  };
};

export default useDataSource;