package org.apache.seatunnel.plugin.alarm.runtime;

import io.yak.ops.plugin.spi.plugin.PrioritySPIFactory;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 发现告警通道工厂，并创建对应的告警通道。
 */
public final class AlarmChannelRegistry {

    private final Map<String, AlarmChannelFactory> factories;
    private final Map<String, AlarmChannel> channels;

    public AlarmChannelRegistry() {
        Map<String, AlarmChannelFactory> factoryMap =
                new PrioritySPIFactory<>(AlarmChannelFactory.class)
                        .getSPIMap();

        this.factories = Collections.unmodifiableMap(
                new LinkedHashMap<>(factoryMap));

        Map<String, AlarmChannel> channelMap = new LinkedHashMap<>();

        for (Map.Entry<String, AlarmChannelFactory> entry
                : factories.entrySet()) {

            channelMap.put(
                    entry.getKey(),
                    entry.getValue().create());
        }

        this.channels = Collections.unmodifiableMap(channelMap);
    }

    public Map<String, AlarmChannelFactory> factories() {
        return factories;
    }

    public AlarmChannel channel(String name) {
        return channels.get(name);
    }
}