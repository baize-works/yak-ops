import type {FormInstance} from "antd";
import {Input, InputNumber, Select, Switch} from "antd";


export default function FieldRenderer(props: {
  field: any;
  dbType: string;
  configForm: FormInstance;
}) {
  const {field, dbType, configForm} = props;

//   if (field.key === "driverLocation") {
//     return (
//       <DriverLocationField
//         field={field}
//         dbType={dbType}
//         configForm={configForm}
//       />
//     );
//   }

  const common = {
    placeholder: field.placeholder,
  };

  switch (field.type) {
    case "INPUT":
      return <Input {...common} size="small"/>;
    case "PASSWORD":
      return <Input.Password {...common} size="small"/>;
    case "SELECT":
      return (
        <Select
          {...common}
          size="small"
          options={field.options?.map((o) => ({
            label: o.label,
            value: o.value,
          }))}
        />
      );
    case "NUMBER":
      return <InputNumber {...common} size="small" style={{width: "100%"}}/>;
    case "SWITCH":
      return <Switch size="small"/>;
    case "TEXTAREA":
      return <Input.TextArea rows={4} {...common} size="small"/>;
    default:
      return <Input {...common} size="small"/>;
  }
}
