package org.apache.seatunnel.plugin.alarm.runtime;

import io.baize.flow.plugin.spi.plugin.PrioritySPIFactory;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;

import java.util.Map;
import java.util.stream.Collectors;

/** Discovers alarm factories and creates their channels outside the SPI artifact. */
public final class AlarmChannelRegistry {
    private final Map<String, AlarmChannelFactory> factories;
    private final Map<String, AlarmChannel> channels;

    public AlarmChannelRegistry() {
        factories = Map.copyOf(new PrioritySPIFactory<>(AlarmChannelFactory.class).getSPIMap());
        channels = factories.entrySet().stream().collect(Collectors.toUnmodifiableMap(
                Map.Entry::getKey, entry -> entry.getValue().create()));
    }

    public Map<String, AlarmChannelFactory> factories() {
        return factories;
    }

    public AlarmChannel channel(String name) {
        return channels.get(name);
    }
}
