package io.yak.ops.infrastructure.verify.job;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class ConsoleSinkHoconBuilder {

    public Config build() {
        Map<String, Object> map = new HashMap<String, Object>(4);
        map.put("parallelism", 1);
        return ConfigFactory.parseMap(map);
    }

    public String pluginName() {
        return "Console";
    }
}
