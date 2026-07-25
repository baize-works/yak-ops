package io.yak.ops.infrastructure.verify.cache;

import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyItemVO;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Date;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ClientDatasourceVerifyMemoryCache implements io.yak.ops.application.port.verify.DatasourceVerificationCache {

    /**
     * 自动连通性测试缓存时间。
     * 建议 5 分钟即可，避免页面切换频繁提交 LinkUp 任务。
     */
    private static final long DEFAULT_TTL_MS = 5 * 60 * 1000L;

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public ClientDatasourceVerifyVO get(String key) {
        if (StringUtils.isBlank(key)) {
            return null;
        }

        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return null;
        }

        long now = System.currentTimeMillis();
        if (entry.getExpireAt() <= now) {
            cache.remove(key);
            return null;
        }

        ClientDatasourceVerifyVO vo = copy(entry.getValue());
        vo.setFromCache(true);
        vo.setCacheExpireAt(entry.getExpireAt());
        return vo;
    }

    public void put(String key, ClientDatasourceVerifyVO value) {
        if (StringUtils.isBlank(key) || value == null) {
            return;
        }

        long expireAt = System.currentTimeMillis() + DEFAULT_TTL_MS;

        ClientDatasourceVerifyVO copy = copy(value);
        copy.setFromCache(false);
        copy.setCacheExpireAt(expireAt);

        CacheEntry entry = new CacheEntry();
        entry.setValue(copy);
        entry.setExpireAt(expireAt);

        cache.put(key, entry);
    }

    public void evict(String key) {
        if (StringUtils.isNotBlank(key)) {
            cache.remove(key);
        }
    }

    public void clear() {
        cache.clear();
    }

    public String buildKey(
            LinkUpClient client,
            DataSource datasource,
            String pluginName,
            String connectorType,
            String role
    ) {
        return String.join(
                "::",
                "clientDatasourceVerify",
                Objects.toString(client == null ? null : client.getId(), ""),
                Objects.toString(client == null ? null : client.getBaseUrl(), ""),
                Objects.toString(datasource == null ? null : datasource.getId(), ""),
                Objects.toString(datasource == null ? null : datasource.getDbType(), ""),
                Objects.toString(getTimeValue(datasource == null ? null : datasource.getUpdateTime()), ""),
                StringUtils.defaultString(pluginName).toUpperCase(),
                StringUtils.defaultString(connectorType).toUpperCase(),
                StringUtils.defaultString(role).toUpperCase()
        );
    }

    private Long getTimeValue(Date date) {
        return date == null ? null : date.getTime();
    }

    private ClientDatasourceVerifyVO copy(ClientDatasourceVerifyVO source) {
        if (source == null) {
            return null;
        }

        ClientDatasourceVerifyVO target = new ClientDatasourceVerifyVO();
        BeanUtils.copyProperties(source, target);

        if (source.getItems() != null) {
            target.setItems(new ArrayList<>());
            for (ClientDatasourceVerifyItemVO item : source.getItems()) {
                ClientDatasourceVerifyItemVO itemCopy = new ClientDatasourceVerifyItemVO();
                BeanUtils.copyProperties(item, itemCopy);
                target.getItems().add(itemCopy);
            }
        }

        return target;
    }

    @Data
    private static class CacheEntry {
        private ClientDatasourceVerifyVO value;
        private long expireAt;
    }
}
