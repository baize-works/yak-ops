package io.baize.flow.web.contract.dto.command;

import io.baize.flow.web.contract.dto.config.ScriptJobContent;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public interface ScriptJobContentCommand {

    ScriptJobContent getContent();
}
