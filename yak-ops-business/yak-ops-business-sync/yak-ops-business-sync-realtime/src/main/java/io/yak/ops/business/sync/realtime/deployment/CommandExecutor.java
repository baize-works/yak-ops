package io.yak.ops.business.sync.realtime.deployment;

import io.yak.ops.business.sync.realtime.config.ConditionalOnRealtimeSyncEnabled;
import io.yak.ops.business.sync.realtime.config.RealtimeSyncProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * 使用参数数组执行外部命令，避免通过 shell 拼接用户输入。
 */
@ConditionalOnRealtimeSyncEnabled
@Component
public class CommandExecutor {

    private static final int MAX_CAPTURED_OUTPUT = 1_000_000;

    private final RealtimeSyncProperties properties;

    public CommandExecutor(RealtimeSyncProperties properties) {
        this.properties = properties;
    }

    public CommandResult execute(List<String> command, Map<String, String> environment, Path directory) {
//    try {
//      ProcessBuilder builder = new ProcessBuilder(command);
//      builder.redirectErrorStream(true);
//      if (directory != null) {
//        Files.createDirectories(directory);
//        builder.directory(directory.toFile());
//      }
//      if (environment != null) {
//        builder.environment().putAll(environment);
//      }
//      Process process = builder.start();
//      StringBuilder output = new StringBuilder();
//      Thread reader = Thread.ofVirtual().start(() -> {
//        try (BufferedReader bufferedReader = new BufferedReader(
//            new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
//          String line;
//          while ((line = bufferedReader.readLine()) != null) {
//            if (output.length() < MAX_CAPTURED_OUTPUT) {
//              int remaining = MAX_CAPTURED_OUTPUT - output.length();
//              output.append(line, 0, Math.min(line.length(), remaining));
//              output.append(System.lineSeparator());
//            }
//          }
//        } catch (Exception exception) {
//          output.append("读取命令输出失败：").append(exception.getMessage());
//        }
//      });
//      boolean finished = process.waitFor(
//          properties.getProcessTimeout().toMillis(), TimeUnit.MILLISECONDS);
//      if (!finished) {
//        process.destroyForcibly();
//        throw new IllegalStateException("外部命令执行超时：" + String.join(" ", command));
//      }
//      reader.join();
//      CommandResult result = new CommandResult(process.exitValue(), output.toString().trim());
//      if (result.getExitCode() != 0) {
//        throw new IllegalStateException(
//            "外部命令执行失败，退出码 " + result.getExitCode() + "：" + result.getOutput());
//      }
//      return result;
//    } catch (InterruptedException exception) {
//      Thread.currentThread().interrupt();
//      throw new IllegalStateException("外部命令执行被中断", exception);
//    } catch (Exception exception) {
//      if (exception instanceof IllegalStateException stateException) {
//        throw stateException;
//      }
//      throw new IllegalStateException("外部命令执行失败：" + exception.getMessage(), exception);
//    }
//  }
        return null;
    }
}