import type {FormInstance, UploadProps} from "antd";
import {Button, Input, message, Upload} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import {uploadDriverJar} from "../services/pluginConfig";

export default function DriverLocationField(props: {
  field: any;
  dbType: string;
  configForm: FormInstance;
}) {
  const {field, dbType, configForm} = props;

  const handleChange = (value: string) => {
    configForm.setFieldValue(field.key, value);
    setTimeout(() => {
      configForm.validateFields([field.key]).catch(() => {
      });
    }, 0);
  };

  const uploadProps: UploadProps = {
    accept: ".jar",
    showUploadList: false,
    beforeUpload: (file) => {
      const isJar = file.name.toLowerCase().endsWith(".jar");
      if (!isJar) {
        message.error("只允许上传 .jar 文件");
        return Upload.LIST_IGNORE;
      }

      const maxMB = 200;
      const okSize = file.size / 1024 / 1024 <= maxMB;
      if (!okSize) {
        message.error(`文件不能超过 ${maxMB}MB`);
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    customRequest: async (options) => {
      const {file, onSuccess, onError} = options;

      try {
        const data = await uploadDriverJar(dbType, file as File);

        const jarValue =
          typeof data === "string"
            ? data
            : data?.fileName || data?.path || "";

        if (!jarValue) {
          throw new Error("上传成功但未返回 jar 信息");
        }

        handleChange(jarValue);
        message.success("驱动包上传成功");
        onSuccess?.(data);
      } catch (e: any) {

        onError?.(e);
      }
    },
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        width: "100%",
      }}
    >
      <Input
        placeholder={field.placeholder || "请输入驱动包路径"}
        value={configForm.getFieldValue(field.key)}
        onChange={(e) => handleChange(e.target.value)}
      />

      <Upload {...uploadProps}>
        <Button
          icon={<UploadOutlined/>}
          style={{
            height: 32,
            borderRadius: 10,
            paddingInline: 16,
          }}
        >
          上传
        </Button>
      </Upload>
    </div>
  );
}
