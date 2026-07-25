package io.yak.ops.application.job.handler.single;

import javax.annotation.Resource;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.application.support.builder.HoconConfigBuilder;
import io.yak.ops.domain.dag.DagGraph;
import io.yak.ops.application.job.handler.JobRuntimeContext;
import io.yak.ops.application.job.handler.JobRuntimeContextFactory;
import io.yak.ops.domain.utils.DagUtil;
import io.yak.ops.web.contract.dto.command.JobDefinitionSaveCommand;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class GuideSingleHoconBuildService {

    @Resource
    private HoconConfigBuilder hoconConfigBuilder;

    @Resource
    private JobRuntimeContextFactory runtimeContextFactory;

    public String build(Map<String, Object> workflow, JobDefinitionSaveCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("command can not be null");
        }
        if (MapUtils.isEmpty(workflow)) {
            throw new IllegalArgumentException("workflow can not be empty");
        }

        String dagJson = JSONUtils.toJsonString(workflow);
        if (StringUtils.isBlank(dagJson)) {
            throw new IllegalArgumentException("workflow can not be blank");
        }

        DagGraph dagGraph = DagUtil.parseAndCheck(dagJson);

        JobRuntimeContext runtimeContext = runtimeContextFactory.create(command);

        return hoconConfigBuilder.build(
                dagGraph,
                runtimeContext.getEnv(),
                runtimeContext.getSchedule()
        );
    }
}
