package io.baize.flow.application.support.job;


import java.util.regex.Pattern;

public class JobUtils {

    // The maximum length of the job execution error message, 4KB
    private static final int ERROR_MESSAGE_MAX_LENGTH = 4096;
    private static final Pattern placeholderPattern =
            Pattern.compile("(\\\\{0,2})\\$\\{(\\w+)(?::(.*?))?\\}");

    public static String getJobInstanceErrorMessage(String message) {
        if (message == null) {
            return null;
        }
        return message.length() > ERROR_MESSAGE_MAX_LENGTH
                ? message.substring(0, ERROR_MESSAGE_MAX_LENGTH)
                : message;
    }

}
