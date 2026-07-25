package io.baize.flow.common.deserializer;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.common.KeyValuePair;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

public class KeyValuePairListDeserializer extends JsonDeserializer<List<KeyValuePair>> {

    @Override
    public List<KeyValuePair> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);

        ObjectMapper mapper = (ObjectMapper) p.getCodec();

        if (node == null || node.isNull()) {
            return java.util.Collections.emptyList();
        }

        if (node.isArray()) {
            return mapper.convertValue(node, new TypeReference<List<KeyValuePair>>() {});
        }

        if (node.isTextual()) {
            String text = node.asText();
            if (StringUtils.isBlank(text)) {
                return java.util.Collections.emptyList();
            }
            return mapper.readValue(text, new TypeReference<List<KeyValuePair>>() {});
        }

        throw new IllegalArgumentException("Unsupported format for field 'other'");
    }
}
