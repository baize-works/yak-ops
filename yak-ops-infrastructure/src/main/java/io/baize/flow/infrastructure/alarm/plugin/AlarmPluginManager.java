package io.baize.flow.infrastructure.alarm.plugin;

import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;
import io.baize.flow.plugin.spi.plugin.PrioritySPIFactory;
import io.baize.flow.api.port.AlarmChannelCatalog;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Discovers and holds all registered {@link AlarmChannelFactory} plugins and
 * their {@link AlarmChannel} workers, mirroring DolphinScheduler's
 * {@code AlertPluginManager}.
 *
 * <p>
 * Reuses the project's {@link PrioritySPIFactory} (ServiceLoader + priority
 * conflict resolution) instead of a hand-rolled loader, and is a Spring
 * component rather than a static singleton so it integrates cleanly with DI.
 * </p>
 */
@Component
@Slf4j
public class AlarmPluginManager implements AlarmChannelCatalog {

    private final Map<String, AlarmChannelFactory> factoryMap = new ConcurrentHashMap<>();

    private final Map<String, AlarmChannel> channelMap = new ConcurrentHashMap<>();

    public AlarmPluginManager() {
        PrioritySPIFactory<AlarmChannelFactory> spiFactory =
                new PrioritySPIFactory<>(AlarmChannelFactory.class);
        spiFactory.getSPIMap().forEach((name, factory) -> {
            factoryMap.put(name, factory);
            channelMap.put(name, factory.create());
            log.info("Registered alarm channel plugin -> {}", name);
        });
    }

    public AlarmChannel getChannel(String name) {
        return channelMap.get(name);
    }

    @Override
    public Map<String, AlarmChannelFactory> getFactoryMap() {
        return factoryMap;
    }
}
