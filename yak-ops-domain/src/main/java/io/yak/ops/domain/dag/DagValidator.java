package io.yak.ops.domain.dag;
/** A framework-independent domain validation rule. */
public interface DagValidator {
    void validate(DagGraph graph, DagCheckResult result);
}
