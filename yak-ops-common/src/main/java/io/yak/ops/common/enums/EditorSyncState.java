package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum EditorSyncState {

    /**
     * The job definition has not been persisted yet.
     *
     * Usually used by the frontend create page.
     */
    UNPUBLISHED("UNPUBLISHED", "未发布"),

    /**
     * The editor content is synchronized with the latest persisted definition content.
     */
    SYNCED("SYNCED", "已同步"),

    /**
     * The editor content has been changed locally but not persisted yet.
     *
     * This state is usually maintained by the frontend.
     */
    DIRTY("DIRTY", "已修改未同步");

    private final String code;

    private final String description;
}
