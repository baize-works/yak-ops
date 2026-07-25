package io.yak.ops.web.contract.dto.command;

import io.yak.ops.web.contract.dto.config.GuideMultiJobContent;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public interface GuideMultiJobContentCommand {

    GuideMultiJobContent getContent();
}
