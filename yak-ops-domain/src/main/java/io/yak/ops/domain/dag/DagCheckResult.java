package io.yak.ops.domain.dag;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the result of a DAG validation process.
 * <p>
 * This class stores validation status, error messages,
 * and warning messages produced during DAG checks.
 */
@Data
public class DagCheckResult {

    /**
     * Indicates whether the DAG is valid
     */
    private boolean valid;

    /**
     * List of validation error messages
     */
    private List<String> errors;

    /**
     * List of validation warning messages
     */
    private List<String> warnings;

    /**
     * Create a new {@code DagCheckResult} instance.
     * <p>
     * Errors and warnings lists are initialized as empty.
     * The {@code valid} flag defaults to {@code false}
     * until validation logic explicitly sets it otherwise.
     */
    public DagCheckResult() {
        this.errors = new ArrayList<>();
        this.warnings = new ArrayList<>();
    }

    /**
     * Add an error message to the validation result.
     * <p>
     * Adding an error will automatically mark the DAG as invalid.
     *
     * @param error error message describing the validation failure
     */
    public void addError(String error) {
        this.errors.add(error);
        this.valid = false;
    }

    /**
     * Add a warning message to the validation result.
     * <p>
     * Warnings do not affect the overall validity of the DAG.
     *
     * @param warning warning message describing a non-critical issue
     */
    public void addWarning(String warning) {
        this.warnings.add(warning);
    }
}
