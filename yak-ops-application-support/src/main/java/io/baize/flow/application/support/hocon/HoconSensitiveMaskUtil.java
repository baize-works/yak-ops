package io.baize.flow.application.support.hocon;

import com.typesafe.config.*;

import java.util.*;
import java.util.regex.Pattern;

public final class HoconSensitiveMaskUtil {

    private static final String MASK = "******";

    /**
     * 敏感字段，可按需扩展
     * 统一使用小写，匹配时忽略大小写
     */
    private static final Set<String> SENSITIVE_KEYS = new HashSet<>(Arrays.asList(
            "password",
            "passwd",
            "pwd",
            "secret",
            "accesskeysecret",
            "token"
    ));

    /**
     * SeaTunnel HOCON 顶层固定顺序
     */
    private static final List<String> ROOT_ORDER = Arrays.asList(
            "env",
            "source",
            "transform",
            "sink"
    );

    private static final ConfigRenderOptions RENDER_OPTIONS = ConfigRenderOptions.defaults()
            .setComments(false)
            .setFormatted(true)
            .setJson(false)
            .setOriginComments(false);

    private HoconSensitiveMaskUtil() {
    }

    /**
     * 脱敏 HOCON 字符串中的敏感字段，并按固定顶层顺序输出
     */
    public static String maskSensitiveInfo(String hoconText) {
        if (hoconText == null || hoconText.trim().isEmpty()) {
            return hoconText;
        }

        try {
            Config config = ConfigFactory.parseString(hoconText);
            ConfigValue maskedRoot = maskValue(config.root());

            if (maskedRoot != null && maskedRoot.valueType() == ConfigValueType.OBJECT) {
                return renderRootInOrder((ConfigObject) maskedRoot);
            }

            return renderValue(maskedRoot);
        } catch (Exception e) {
            // 解析失败兜底，至少保证敏感字段不泄露
            return maskByRegex(hoconText);
        }
    }

    /**
     * 递归脱敏
     */
    private static ConfigValue maskValue(ConfigValue value) {
        if (value == null) {
            return null;
        }

        switch (value.valueType()) {
            case OBJECT:
                return maskObject((ConfigObject) value);
            case LIST:
                return maskList((ConfigList) value);
            default:
                return value;
        }
    }

    /**
     * 脱敏对象
     */
    private static ConfigValue maskObject(ConfigObject obj) {
        ConfigObject result = obj;

        for (Map.Entry<String, ConfigValue> entry : obj.entrySet()) {
            String key = entry.getKey();
            ConfigValue childValue = entry.getValue();

            if (isSensitiveKey(key)) {
                result = result.withValue(key, ConfigValueFactory.fromAnyRef(MASK));
            } else {
                ConfigValue maskedChild = maskValue(childValue);
                if (maskedChild != childValue) {
                    result = result.withValue(key, maskedChild);
                }
            }
        }

        return result;
    }

    /**
     * 脱敏列表
     */
    private static ConfigValue maskList(ConfigList list) {
        List<Object> newList = new ArrayList<>(list.size());
        boolean changed = false;

        for (ConfigValue item : list) {
            ConfigValue maskedItem = maskValue(item);
            newList.add(maskedItem == null ? null : maskedItem.unwrapped());
            if (maskedItem != item) {
                changed = true;
            }
        }

        return changed ? ConfigValueFactory.fromIterable(newList) : list;
    }

    /**
     * 顶层按固定顺序渲染，避免 root.render() 打乱 env/source/transform/sink 顺序
     */
    private static String renderRootInOrder(ConfigObject root) {
        StringBuilder sb = new StringBuilder();
        Set<String> renderedKeys = new HashSet<>();

        // 先输出固定顺序的顶层字段
        for (String key : ROOT_ORDER) {
            if (root.containsKey(key)) {
                appendKeyValue(sb, key, root.get(key));
                renderedKeys.add(key);
            }
        }

        // 再输出剩余字段
        for (Map.Entry<String, ConfigValue> entry : root.entrySet()) {
            String key = entry.getKey();
            if (!renderedKeys.contains(key)) {
                appendKeyValue(sb, key, entry.getValue());
            }
        }

        return sb.toString().trim();
    }

    /**
     * 追加单个顶层 key-value
     * <p>
     * 关键点：
     * 不能直接 key + value.render()
     * 否则 object 渲染时可能省略最外层 {}，导致结构变成：
     * env job { ... }
     * parallelism=1
     * <p>
     * 正确做法：包装成单键 Config 再整体 render
     */
    private static void appendKeyValue(StringBuilder sb, String key, ConfigValue value) {
        if (sb.length() > 0) {
            sb.append("\n");
        }

        Config single = ConfigFactory.empty().withValue(key, value);
        sb.append(single.root().render(RENDER_OPTIONS).trim());
        sb.append("\n");
    }

    /**
     * 渲染单个 ConfigValue
     */
    private static String renderValue(ConfigValue value) {
        return value == null ? "null" : value.render(RENDER_OPTIONS);
    }

    /**
     * 是否敏感字段：忽略大小写
     */
    private static boolean isSensitiveKey(String key) {
        if (key == null) {
            return false;
        }
        return SENSITIVE_KEYS.contains(normalizeKey(key));
    }

    /**
     * key 标准化：
     * 1. trim
     * 2. 转小写
     * 3. 去掉下划线/中划线/空格，兼容 accessKeySecret / access_key_secret / access-key-secret
     */
    private static String normalizeKey(String key) {
        return key.trim()
                .toLowerCase(Locale.ROOT)
                .replace("_", "")
                .replace("-", "")
                .replace(" ", "");
    }

    /**
     * HOCON 解析失败时的兜底方案
     * <p>
     * 兼容：
     * password="xxx"
     * password = "xxx"
     * "password"=xxx
     * password=xxx
     * access_key_secret = abc
     */
    private static String maskByRegex(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        String result = text;
        for (String key : SENSITIVE_KEYS) {
            String keyPattern = buildRegexKeyPattern(key);
            result = result.replaceAll(
                    "(?im)(\"?" + keyPattern + "\"?\\s*[=:]\\s*)(\"[^\"]*\"|[^\\s\\r\\n}]+)",
                    "$1\"******\""
            );
        }
        return result;
    }

    /**
     * 为正则兜底构造 key 匹配：
     * accesskeysecret -> access[_\\-\\s]*key[_\\-\\s]*secret
     * password -> password
     */
    private static String buildRegexKeyPattern(String normalizedKey) {
        if ("accesskeysecret".equals(normalizedKey)) {
            return "access[_\\-\\s]*key[_\\-\\s]*secret";
        }
        return Pattern.quote(normalizedKey);
    }
}