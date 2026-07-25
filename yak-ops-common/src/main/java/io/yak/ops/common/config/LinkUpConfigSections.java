package io.yak.ops.common.config;

/** Configuration sections for Hazelcast LinkUp shared by YAML based configurations */
enum LinkUpConfigSections {
    LINKUP("linkup", false),
    ENGINE("engine", false);

    final String name;
    final boolean multipleOccurrence;

    LinkUpConfigSections(String name, boolean multipleOccurrence) {
        this.name = name;
        this.multipleOccurrence = multipleOccurrence;
    }

    static boolean canOccurMultipleTimes(String name) {
        for (LinkUpConfigSections element : values()) {
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
