package io.baize.flow.web.contract.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.baize.flow.common.enums.EditorSyncState;
import io.baize.flow.common.enums.ReleaseState;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class JobDefinitionStateVO {

    /**
     * Editor synchronization state.
     *
     * UNPUBLISHED: not persisted yet.
     * SYNCED: current editor content is synchronized with database.
     * DIRTY: frontend local content has been changed but not persisted.
     */
    private EditorSyncState editorSyncState;

    /**
     * Job release state.
     *
     * ONLINE / OFFLINE.
     */
    private ReleaseState releaseState;

    /**
     * Current job definition version.
     */
    private Integer jobVersion;

    /**
     * Current job definition content version.
     */
    private Integer contentVersion;

    public static JobDefinitionStateVO synced(
            ReleaseState releaseState,
            Integer jobVersion,
            Integer contentVersion) {
        return JobDefinitionStateVO.builder()
                .editorSyncState(EditorSyncState.SYNCED)
                .releaseState(releaseState)
                .jobVersion(jobVersion)
                .contentVersion(contentVersion)
                .build();
    }

    public static JobDefinitionStateVO unpublished() {
        return JobDefinitionStateVO.builder()
                .editorSyncState(EditorSyncState.UNPUBLISHED)
                .releaseState(ReleaseState.OFFLINE)
                .jobVersion(null)
                .contentVersion(null)
                .build();
    }
}