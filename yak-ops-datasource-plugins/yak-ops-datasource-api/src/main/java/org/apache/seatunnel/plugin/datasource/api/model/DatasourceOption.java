package org.apache.seatunnel.plugin.datasource.api.model;

/** Stable transport-neutral option returned by datasource metadata discovery. */
public final class DatasourceOption {
    private Object value;
    private String label;
    private String description;

    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
