package org.apache.seatunnel.plugin.datasource.api.option;


public enum DeserializeFormat {
    DEFAULT("default");

    private String name;

    DeserializeFormat(String name) {
        this.name = name;
    }
}
