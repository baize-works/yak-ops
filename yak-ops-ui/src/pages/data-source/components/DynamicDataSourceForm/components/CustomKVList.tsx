import {MinusCircleOutlined, PlusOutlined} from "@ant-design/icons";
import {Button, Form, Input} from "antd";

export default function CustomKVList(props: { intl: any; field: any }) {
  const {intl, field} = props;

  return (
    <Form.Item label={field.label} style={{marginBottom: 18}}>
      <Form.List name={field.key}>
        {(fields, {add, remove}) => (
          <div style={{width: "100%"}}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {fields.map(({key, name, ...restField}) => (
                <div
                  key={key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 28px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Form.Item
                    {...restField}
                    name={[name, "key"]}
                    style={{marginBottom: 0}}
                    rules={[
                      {
                        required: true,
                        message: intl.formatMessage({
                          id: "pages.datasource.form.other.keyRequired",
                          defaultMessage: "key can not be null",
                        }),
                      },
                    ]}
                  >
                    <Input
                      placeholder={intl.formatMessage({
                        id: "pages.datasource.form.other.keyPlaceholder",
                        defaultMessage: "key",
                      })}
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, "value"]}
                    style={{marginBottom: 0}}
                    rules={[
                      {
                        required: true,
                        message: intl.formatMessage({
                          id: "pages.datasource.form.other.valueRequired",
                          defaultMessage: "value can not be null",
                        }),
                      },
                    ]}
                  >
                    <Input
                      placeholder={intl.formatMessage({
                        id: "pages.datasource.form.other.valuePlaceholder",
                        defaultMessage: "value",
                      })}
                    />
                  </Form.Item>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#98A2B3",
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                    onClick={() => remove(name)}
                  >
                    <MinusCircleOutlined/>
                  </div>
                </div>
              ))}
            </div>

            <Form.Item style={{marginBottom: 0, marginTop: 12}}>
              <Button
                type="dashed"
                onClick={() => add({key: "", value: ""})}
                block
                icon={<PlusOutlined/>}
                style={{borderRadius: 16}}
                className="h-8 rounded-[10px] border-[#D0D5DD] bg-[#FCFCFD] text-[#475467] transition-all duration-200 hover:border-[hsl(231 48% 48%)] hover:bg-[hsl(231 48% 48%)] hover:text-[hsl(231 48% 48%)] active:border-[#98A2B3] active:bg-[#F2F4F7]"
              >
                {intl.formatMessage({
                  id: "pages.datasource.form.other.addConnSetting",
                  defaultMessage: "Add Database Connection Settings",
                })}
              </Button>
            </Form.Item>
          </div>
        )}
      </Form.List>
    </Form.Item>
  );
}
