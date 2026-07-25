package io.yak.ops.plugin.spi.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;

import static java.util.stream.Collectors.toMap;

@Getter
public enum DbType {

    MYSQL("MYSQL", "MYSQL", "MYSQL"),
    ORACLE("ORACLE", "ORACLE", "ORACLE"),
    POSTGRE_SQL("POSTGRE_SQL", "POSTGRE_SQL", "POSTGRE_SQL"),
    DORIS("DORIS", "DORIS", "DORIS"),
    KINGBASE("KINGBASE", "KINGBASE", "KINGBASE"),
    DAMENG("DAMENG", "DAMENG", "DAMENG"),
    H2("H2", "H2", "H2")
    ;

    private static final Map<String, DbType> DB_TYPE_MAP =
            Arrays.stream(DbType.values()).collect(toMap(DbType::getCode, Function.identity()));

    private final String code;
    private final String name;
    private final String descp;

    DbType(String code, String name, String descp) {
        this.code = code;
        this.name = name;
        this.descp = descp;
    }

    public static DbType of(String type) {
        if (DB_TYPE_MAP.containsKey(type)) {
            return DB_TYPE_MAP.get(type);
        }
        return null;
    }
}

