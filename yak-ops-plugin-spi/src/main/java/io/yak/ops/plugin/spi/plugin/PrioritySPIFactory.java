
package io.yak.ops.plugin.spi.plugin;


import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.ServiceLoader;

@Slf4j
public class PrioritySPIFactory<T extends PrioritySPI> {

    private final Map<String, T> map = new HashMap<>();

    public PrioritySPIFactory(Class<T> spiClass) {
        for (T t : ServiceLoader.load(spiClass)) {
            if (map.containsKey(t.getIdentify().getName())) {
                resolveConflict(t);
            } else {
                map.put(t.getIdentify().getName(), t);
            }
        }
    }

    public Map<String, T> getSPIMap() {
        return Collections.unmodifiableMap(map);
    }

    private void resolveConflict(T newSPI) {
        SPIIdentify identify = newSPI.getIdentify();
        T oldSPI = map.get(identify.getName());

        if (newSPI.compareTo(oldSPI.getIdentify().getPriority()) == 0) {
            throw new IllegalArgumentException(
                    String.format("These two spi plugins has conflict identify name with the same priority: %s, %s",
                            oldSPI.getIdentify(), newSPI.getIdentify()));
        } else if (newSPI.compareTo(oldSPI.getIdentify().getPriority()) > 0) {
            System.out.println("The " + newSPI.getIdentify() + " plugin has high priority, will override " + oldSPI);
            map.put(identify.getName(), newSPI);
        } else {
            System.out.println("The low plugin " + newSPI + " will be skipped");
        }
    }
}
