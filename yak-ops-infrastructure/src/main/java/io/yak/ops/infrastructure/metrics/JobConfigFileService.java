package io.yak.ops.infrastructure.metrics;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Service responsible for managing temporary SeaTunnel job
 * configuration files on the local filesystem.
 *
 * <p>
 * Job configurations are written to disk before submission
 * and can be cleaned up after job completion.
 * </p>
 */
@Service
@Slf4j
public class JobConfigFileService {

    /**
     * Directory name used to store generated job configuration files.
     * The directory is created under the application's working directory.
     */
    private static final String CONFIG_DIR = "profile";

    /**
     * Write job configuration content to a local file.
     *
     * @param jobDefineId unique job definition identifier
     * @param jobConfig   job configuration content
     * @return absolute path of the generated configuration file
     */
    public String writeConfig(Long jobDefineId, String jobConfig) {
        String filePath = buildFilePath(jobDefineId);
        File file = new File(filePath);

        try {
            // Ensure parent directory exists
            FileUtils.forceMkdirParent(file);

            // Write configuration content using UTF-8 encoding
            FileUtils.writeStringToFile(file, jobConfig, StandardCharsets.UTF_8);

            log.info("Job config written to: {}", filePath);
            return filePath;
        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to write config for jobDefineId: " + jobDefineId, e
            );
        }
    }

    /**
     * Delete the local configuration file for the given job definition.
     *
     * <p>
     * This method fails silently if the file does not exist.
     * </p>
     *
     * @param jobDefineId unique job definition identifier
     */
    public void cleanup(Long jobDefineId) {
        File file = new File(buildFilePath(jobDefineId));
        FileUtils.deleteQuietly(file);
    }

    /**
     * Build the absolute path of the job configuration file.
     *
     * @param jobDefineId unique job definition identifier
     * @return configuration file path
     */
    private String buildFilePath(Long jobDefineId) {
        return System.getProperty("user.dir")
                + File.separator + CONFIG_DIR
                + File.separator + jobDefineId + ".conf";
    }
}
