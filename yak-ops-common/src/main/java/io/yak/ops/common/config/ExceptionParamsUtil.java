package io.yak.ops.common.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExceptionParamsUtil {

    private static final Pattern PARAMS_PATTERN = Pattern.compile("<([a-zA-Z0-9]+)+>");

    /**
     * Get all params key in description, the param key should be wrapped by <>. eg: "<param1>
     * <param2>" will return ["param1", "param2"]
     *
     * @param description error description
     * @return params key list
     */
    public static List<String> getParams(String description) {
        // find all match params key in description
        Matcher matcher = PARAMS_PATTERN.matcher(description);
        List<String> params = new ArrayList<>();
        while (matcher.find()) {
            String key = matcher.group(1);
            params.add(key);
        }
        return params;
    }

    public static String getDescription(String descriptionTemplate, Map<String, String> params) {
        assertParamsMatchWithDescription(descriptionTemplate, params);
        String description = descriptionTemplate;
        for (String param : getParams(descriptionTemplate)) {
            String value = params.get(param);
            description = description.replace(String.format("<%s>", param), value);
        }
        return description;
    }

    public static void assertParamsMatchWithDescription(
            String descriptionTemplate, Map<String, String> params) {
        getParams(descriptionTemplate)
                .forEach(
                        param -> {
                            if (!params.containsKey(param)) {
                                throw new IllegalArgumentException(
                                        String.format(
                                                "Param [%s] is not set in error message [%s]",
                                                param, descriptionTemplate));
                            }
                        });
    }
}
