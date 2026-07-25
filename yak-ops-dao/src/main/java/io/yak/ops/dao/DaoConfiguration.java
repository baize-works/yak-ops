package io.yak.ops.dao;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("io.yak.ops.dao.mapper")
public class DaoConfiguration {
}
