package io.yak.ops.application.model.dto.command;

import io.yak.ops.application.model.dto.config.GuideMultiJobContent;

/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public interface GuideMultiJobContentCommand {

    GuideMultiJobContent getContent();
}
