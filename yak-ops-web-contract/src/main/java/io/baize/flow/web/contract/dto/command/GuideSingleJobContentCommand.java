package io.baize.flow.web.contract.dto.command;

import java.util.Map;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public interface GuideSingleJobContentCommand {

    Map<String, Object> getWorkflow();
}