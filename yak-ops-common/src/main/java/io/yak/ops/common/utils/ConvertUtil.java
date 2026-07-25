package io.yak.ops.common.utils;

import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Slf4j
public class ConvertUtil {

    public static <T> T sourceToTarget(Object source, Class<T> target) {
        if (source == null) {
            return null;
        }
        T targetObject;
        try {
            targetObject = target.newInstance();
            copyProperties(source, targetObject);
        } catch (Exception e) {
            log.error("convert error ", e);
            throw new RuntimeException("对象转换失败");
        }

        return targetObject;
    }

    public static <T> List<T> sourceListToTarget(Collection<?> sourceList, Class<T> target) {
        if (sourceList == null) {
            return null;
        }

        List<T> targetList = new ArrayList<>(sourceList.size());
        try {
            for (Object source : sourceList) {
                T targetObject = target.newInstance();
                copyProperties(source, targetObject);
                targetList.add(targetObject);
            }
        } catch (Exception e) {
            log.error("convert error ", e);
            throw new RuntimeException("对象列表转换失败");
        }

        return targetList;
    }


    private static void copyProperties(Object source, Object target) throws ReflectiveOperationException {
        for (java.beans.PropertyDescriptor descriptor : java.beans.Introspector.getBeanInfo(source.getClass()).getPropertyDescriptors()) {
            if (descriptor.getReadMethod() == null) continue;
            try {
                java.beans.PropertyDescriptor targetDescriptor = new java.beans.PropertyDescriptor(descriptor.getName(), target.getClass());
                if (targetDescriptor.getWriteMethod() != null) {
                    targetDescriptor.getWriteMethod().invoke(target, descriptor.getReadMethod().invoke(source));
                }
            } catch (java.beans.IntrospectionException ignored) {
                // The target does not expose this source property.
            }
        }
    }

    public static String list2String(List<?> list, String separator) {
        if (list == null || list.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (Object item : list) {
            sb.append(item).append(separator);
        }
        return sb.deleteCharAt(sb.length() - 1).toString();
    }

}
