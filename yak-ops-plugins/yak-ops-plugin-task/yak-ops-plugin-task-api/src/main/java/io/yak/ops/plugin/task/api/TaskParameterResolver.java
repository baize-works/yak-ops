package io.yak.ops.plugin.task.api;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 将任务配置中的 ${name} 占位符替换为工作流全局参数。
 */
public final class TaskParameterResolver {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{([A-Za-z0-9_.-]+)}");

    private TaskParameterResolver() {
    }

    public static Map<String, Object> resolveConfiguration(
            Map<String, Object> configuration,
            Map<String, Object> parameters) {
        Map<String, Object> resolved = new LinkedHashMap<>();
        if (configuration == null || configuration.isEmpty()) {
            return resolved;
        }
        configuration.forEach((key, value) -> resolved.put(key, resolveValue(value, parameters)));
        return resolved;
    }

    private static Object resolveValue(Object value, Map<String, Object> parameters) {
        if (value instanceof String) {
            String text = (String) value;
            return resolveString(text, parameters);
        }
        if (value instanceof Map<?, ?>) {
            Map<?, ?> source = (Map<?, ?>) value;
            Map<String, Object> resolved = new LinkedHashMap<>();
            source.forEach((key, item) -> resolved.put(
                    String.valueOf(key),
                    resolveValue(item, parameters)));
            return resolved;
        }
        if (value instanceof Collection<?>) {
            Collection<?> source = (Collection<?>) value;
            List<Object> resolved = new ArrayList<>(source.size());
            for (Object item : source) {
                resolved.add(resolveValue(item, parameters));
            }
            return resolved;
        }
        return value;
    }

    private static Object resolveString(String text, Map<String, Object> parameters) {
        Matcher exact = PLACEHOLDER.matcher(text);
        if (exact.matches()) {
            return requireParameter(parameters, exact.group(1));
        }

        Matcher matcher = PLACEHOLDER.matcher(text);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            Object parameter = requireParameter(parameters, matcher.group(1));
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(String.valueOf(parameter)));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private static Object requireParameter(Map<String, Object> parameters, String name) {
        LookupResult result = lookup(parameters, name);
        if (!result.found) {
            throw new IllegalArgumentException("未找到任务参数：" + name);
        }
        return result.value;
    }

    private static LookupResult lookup(Map<String, Object> parameters, String name) {
        if (parameters == null) {
            return LookupResult.notFound();
        }
        if (parameters.containsKey(name)) {
            return LookupResult.found(parameters.get(name));
        }

        Object current = parameters;
        for (String part : name.split("\\.")) {
            if (!(current instanceof Map<?, ?>)) {
                return LookupResult.notFound();
            }
            Map<?, ?> currentMap = (Map<?, ?>) current;
            if (!currentMap.containsKey(part)) {
                return LookupResult.notFound();
            }
            current = currentMap.get(part);
        }
        return LookupResult.found(current);
    }

    private static final class LookupResult {

        private final boolean found;
        private final Object value;

        private LookupResult(boolean found, Object value) {
            this.found = found;
            this.value = value;
        }

        private static LookupResult found(Object value) {
            return new LookupResult(true, value);
        }

        private static LookupResult notFound() {
            return new LookupResult(false, null);
        }
    }
}
