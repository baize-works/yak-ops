package io.yak.ops.domain.dag;

import java.util.ArrayList;
import java.util.List;

/** Result of applying domain validation rules to a DAG. */
public class DagCheckResult {
    private boolean valid;
    private final List<String> errors = new ArrayList<String>();
    private final List<String> warnings = new ArrayList<String>();
    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public List<String> getErrors() { return errors; }
    public List<String> getWarnings() { return warnings; }
    public void addError(String error) { errors.add(error); valid = false; }
    public void addWarning(String warning) { warnings.add(warning); }
}
