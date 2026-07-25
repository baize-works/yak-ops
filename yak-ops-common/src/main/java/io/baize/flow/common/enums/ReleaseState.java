package io.baize.flow.common.enums;


public enum ReleaseState {

    /**
     * 0 offline
     * 1 online
     */
    OFFLINE(0, "offline"),
    ONLINE(1, "online");

    ReleaseState(int code, String descp) {
        this.code = code;
        this.descp = descp;
    }

    private final int code;

    private final String descp;

    public static ReleaseState getEnum(int value) {
        for (ReleaseState e : ReleaseState.values()) {
            if (e.code == value) {
                return e;
            }
        }
        return null;
    }

    public boolean isOnline() {
        return this == ONLINE;
    }

    public boolean isOffline() {
        return this == OFFLINE;
    }

    public int getCode() {
        return code;
    }

    public String getDescp() {
        return descp;
    }
}
