package io.yak.ops.boot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;

/**
 * Yak Ops application entry point.
 *
 * <p>The first runnable baseline starts without an external database. Yak Framework remains on the
 * classpath and its non-database extension beans are loaded, while database-backed security features
 * are enabled later through configuration.</p>
 */
@SpringBootApplication(
        scanBasePackages = "io.yak.ops",
        exclude = {
            DataSourceAutoConfiguration.class,
            DataSourceTransactionManagerAutoConfiguration.class,
            FlywayAutoConfiguration.class
        })
public class YakOpsApplication {

  public static void main(String[] args) {
    SpringApplication.run(YakOpsApplication.class, args);
  }
}
