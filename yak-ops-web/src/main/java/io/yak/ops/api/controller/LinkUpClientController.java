package io.yak.ops.api.controller;


import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.Resource;
import io.yak.ops.application.service.LinkUpClientService;
import io.yak.ops.dao.entity.LinkUpClient;
import io.yak.ops.application.model.dto.ClientDatasourceVerifyDTO;
import io.yak.ops.application.model.dto.LinkUpClientDTO;
import io.yak.ops.application.model.dto.LinkUpClientEndpointDTO;
import io.yak.ops.application.model.dto.LinkUpClientPageDTO;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.application.model.vo.OptionVO;
import io.yak.ops.application.model.vo.LinkUpClientMetricsVO;
import io.yak.ops.application.model.vo.LinkUpClientVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/devops/client")
public class LinkUpClientController {

    @Resource
    private LinkUpClientService linkupClientService;

    @PostMapping("/saveOrUpdate")
    public Result<Void> saveOrUpdate(@RequestBody LinkUpClientDTO dto) {
        linkupClientService.saveOrUpdate(dto);
        return Result.buildSuc();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        linkupClientService.deleteById(id);
        return Result.buildSuc();
    }

    @GetMapping("/{id}/metrics")
    public Result<LinkUpClientMetricsVO> metrics(@PathVariable("id") Long clientId) {
        return Result.buildSuc(linkupClientService.metrics(clientId));
    }

    @GetMapping("/option")
    public Result<List<OptionVO>> option() {
        return Result.buildSuc(linkupClientService.option());
    }

    @PostMapping("/page")
    public Result<IPage<LinkUpClient>> page(@RequestBody LinkUpClientPageDTO dto) {
        return Result.buildSuc(linkupClientService.page(dto));
    }

    @PostMapping("/{clientId}/verify-datasource")
    public Result<ClientDatasourceVerifyVO> verifyDatasource(
            @PathVariable("clientId") Long clientId,
            @RequestBody ClientDatasourceVerifyDTO dto) {
        return Result.buildSuc(linkupClientService.verifyDatasource(clientId, dto));
    }

    @GetMapping("/instance/{instanceId}/logs")
    public Result<String> logsByInstanceId(
            @PathVariable("instanceId") Long instanceId,
            @RequestParam(value = "jobMode", required = false) String jobMode) {
        return Result.buildSuc(linkupClientService.logsByInstanceId(instanceId, jobMode));
    }

    @GetMapping("/{clientId}/jobs/checkpoints/{jobId}")
    public Result<Map<String, Object>> checkpointOverview(
            @PathVariable("clientId") Long clientId,
            @PathVariable("jobId") Long jobId) {
        return Result.buildSuc(
                linkupClientService.checkpointOverview(clientId, jobId)
        );
    }

    @GetMapping("/{clientId}/jobs/checkpoints/history/{jobId}")
    public Result<List<Map<String, Object>>> checkpointHistory(
            @PathVariable("clientId") Long clientId,
            @PathVariable("jobId") Long jobId,
            @RequestParam(value = "pipelineId", required = false) Long pipelineId,
            @RequestParam(value = "limit", required = false, defaultValue = "20") Integer limit,
            @RequestParam(value = "status", required = false) String status) {
        return Result.buildSuc(
                linkupClientService.checkpointHistory(
                        clientId,
                        jobId,
                        pipelineId,
                        limit,
                        status
                )
        );
    }

    @GetMapping("/{clientId}/nodes")
    public Result<List<LinkUpClientEndpointDTO>> nodes(@PathVariable("clientId") Long clientId) {
        return Result.buildSuc(linkupClientService.nodes(clientId));
    }

    @PostMapping("/{clientId}/nodes/refresh")
    public Result<List<LinkUpClientEndpointDTO>> refreshNodes(@PathVariable("clientId") Long clientId) {
        return Result.buildSuc(linkupClientService.refreshNodes(clientId));
    }
}
