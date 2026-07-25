package org.apache.seatunnel.plugin.alarm.webhook;

import com.google.auto.service.AutoService;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;
import io.baize.flow.plugin.spi.form.FieldType;
import io.baize.flow.plugin.spi.form.FormFieldConfig;

import java.util.List;

/**
 * Factory for the built-in webhook alarm channel, mirroring DolphinScheduler's
 * per-plugin {@code AlertChannelFactory} + {@code @AutoService} registration.
 */
@AutoService(AlarmChannelFactory.class)
public class WebhookAlarmChannelFactory implements AlarmChannelFactory {

    public static final String WEBHOOK = "WEBHOOK";

    @Override
    public String name() {
        return WEBHOOK;
    }

    @Override
    public AlarmChannel create() {
        return new WebhookAlarmChannel();
    }

    @Override
    public List<FormFieldConfig> params() {
        return List.of(
                buildField("url", "Webhook 地址", FieldType.INPUT, "https://oapi.dingtalk.com/robot/send?access_token=xxx", null),
                buildField("method", "HTTP 方法", FieldType.INPUT, null, "POST"),
                buildField("timeoutMs", "超时(ms)", FieldType.NUMBER, null, "10000"),
                buildField("headers", "请求头(JSON)", FieldType.TEXTAREA,
                        "{\"Authorization\":\"Bearer xxx\"}", null),
                buildField("bodyTemplate", "请求体模板", FieldType.TEXTAREA,
                        "{\"msgtype\":\"text\",\"text\":{\"content\":\"${title}\\n${content}\"}}",
                        null)
        );
    }

    private FormFieldConfig buildField(String key, String label, FieldType type,
                                       String placeholder, String defaultValue) {
        FormFieldConfig field = new FormFieldConfig();
        field.setKey(key);
        field.setLabel(label);
        field.setType(type);
        field.setPlaceholder(placeholder);
        field.setDefaultValue(defaultValue);
        return field;
    }
}
