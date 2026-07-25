package io.yak.ops.common.config;

/** Configuration sections for Hazelcast SeaTunnel shared by YAML based configurations */
enum SeaTunnelConfigSections {
    SEATUNNEL("seatunnel", false),
    ENGINE("engine", false);

    final String name;
    final boolean multipleOccurrence;

    SeaTunnelConfigSections(String name, boolean multipleOccurrence) {
        this.name = name;
        this.multipleOccurrence = multipleOccurrence;
    }

    static boolean canOccurMultipleTimes(String name) {
        for (SeaTunnelConfigSections element : values()) {
            if (name.equals(element.name)) {
                return element.multipleOccurrence;
            }
        }
        return false;
    }

    boolean isEqual(String name) {
        return this.name.equals(name);
    }
}
