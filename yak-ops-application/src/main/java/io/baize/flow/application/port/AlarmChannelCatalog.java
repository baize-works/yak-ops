package io.baize.flow.application.port;

import java.util.Map;
import org.apache.seatunnel.plugin.alarm.api.AlarmChannelFactory;

/** Output port exposing alarm-channel plugins to application and web callers. */
public interface AlarmChannelCatalog {
    Map<String, AlarmChannelFactory> getFactoryMap();
}
