package org.apache.seatunnel.plugin.datasource.api.option;


import io.baize.flow.common.config.Options;
import io.baize.flow.common.config.SingleChoiceOption;

import java.util.Arrays;

public class MySqlSourceOptions {
    public static final SingleChoiceOption<StartupMode> STARTUP_MODE =
            (SingleChoiceOption)
                    Options.key(SourceOptions.STARTUP_MODE_KEY)
                            .singleChoice(
                                    StartupMode.class,
                                    Arrays.asList(
                                            StartupMode.INITIAL,
                                            StartupMode.EARLIEST,
                                            StartupMode.LATEST,
                                            StartupMode.SPECIFIC,
                                            StartupMode.TIMESTAMP))
                            .defaultValue(StartupMode.INITIAL)
                            .withDescription(
                                    "Optional startup mode for CDC source, valid enumerations are "
                                            + "\"initial\", \"earliest\", \"latest\" , \"specific\" or \"timestamp\"");

    public static final SingleChoiceOption<StopMode> STOP_MODE =
            (SingleChoiceOption)
                    Options.key(SourceOptions.STOP_MODE_KEY)
                            .singleChoice(
                                    StopMode.class,
                                    Arrays.asList(
                                            StopMode.LATEST, StopMode.SPECIFIC, StopMode.NEVER))
                            .defaultValue(StopMode.NEVER)
                            .withDescription(
                                    "Optional stop mode for CDC source, valid enumerations are "
                                            + "\"never\", \"latest\" or \"specific\"");
}
