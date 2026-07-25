package org.apache.seatunnel.plugin.alarm.webhook;

/**
 * Minimal JSON serializer for the webhook alarm payload.
 *
 * <p>
 * Hand-rolled on purpose so the webhook plugin stays free of any JSON library
 * dependency and remains a self-contained, distributable SPI plugin.
 * </p>
 */
final class WebhookJsonBuilder {

    private final StringBuilder sb = new StringBuilder();

    private WebhookJsonBuilder() {
        sb.append('{');
    }

    static WebhookJsonBuilder object() {
        return new WebhookJsonBuilder();
    }

    WebhookJsonBuilder add(String key, String value) {
        if (value == null) {
            return this;
        }
        if (sb.length() > 1) {
            sb.append(',');
        }
        sb.append(quote(key)).append(':').append(quote(value));
        return this;
    }

    WebhookJsonBuilder add(String key, Number value) {
        if (value == null) {
            return this;
        }
        if (sb.length() > 1) {
            sb.append(',');
        }
        sb.append(quote(key)).append(':').append(value);
        return this;
    }

    String build() {
        sb.append('}');
        return sb.toString();
    }

    private static String quote(String s) {
        StringBuilder b = new StringBuilder(s.length() + 2);
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':
                    b.append("\\\"");
                    break;
                case '\\':
                    b.append("\\\\");
                    break;
                case '\n':
                    b.append("\\n");
                    break;
                case '\r':
                    b.append("\\r");
                    break;
                case '\t':
                    b.append("\\t");
                    break;
                default:
                    if (c < 0x20) {
                        b.append(String.format("\\u%04x", (int) c));
                    } else {
                        b.append(c);
                    }
            }
        }
        b.append('"');
        return b.toString();
    }
}
