package io.yak.ops.infrastructure.alarm.plugin;

import io.yak.ops.application.port.AlarmChannelCatalog;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannel;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;
import org.apache.seatunnel.plugin.alarm.runtime.AlarmChannelRegistry;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Spring adapter for the reusable alarm runtime registry. */
@Component
public class AlarmPluginManager implements AlarmChannelCatalog {
    private final AlarmChannelRegistry registry = new AlarmChannelRegistry();

    public AlarmChannel getChannel(String name) {
        return registry.channel(name);
    }

    @Override
    public Map<String, AlarmChannelFactory> getFactoryMap() {
        return registry.factories();
    }
}
