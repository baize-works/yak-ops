package io.yak.ops.api.controller;


import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.Resource;
import io.yak.ops.application.service.SeaTunnelClientService;
import io.yak.ops.dao.entity.SeaTunnelClient;
import io.yak.ops.application.model.dto.ClientDatasourceVerifyDTO;
import io.yak.ops.application.model.dto.SeaTunnelClientDTO;
import io.yak.ops.application.model.dto.SeaTunnelClientEndpointDTO;
import io.yak.ops.application.model.dto.SeaTunnelClientPageDTO;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.application.model.vo.OptionVO;
import io.yak.ops.application.model.vo.SeaTunnelClientMetricsVO;
import io.yak.ops.application.model.vo.SeaTunnelClientVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/devops/client")
public class SeaTunnelClientController {

    @Resource
    private SeaTunnelClientService seatunnelClientService;

    @PostMapping("/saveOrUpdate")
    public Result<Void> saveOrUpdate(@RequestBody SeaTunnelClientDTO dto) {
        seatunnelClientService.saveOrUpdate(dto);
        return Result.buildSuc();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        seatunnelClientService.deleteById(id);
        return Result.buildSuc();
    }

    @GetMapping("/{id}/metrics")
    public Result<SeaTunnelClientMetricsVO> metrics(@PathVariable("id") Long clientId) {
        return Result.buildSuc(seatunnelClientService.metrics(clientId));
    }

    @GetMapping("/option")
    public Result<List<OptionVO>> option() {
        return Result.buildSuc(seatunnelClientService.option());
    }

    @PostMapping("/page")
    public Result<IPage<SeaTunnelClient>> page(@RequestBody SeaTunnelClientPageDTO dto) {
        return Result.buildSuc(seatunnelClientService.page(dto));
    }

    @PostMapping("/{clientId}/verify-datasource")
    public Result<ClientDatasourceVerifyVO> verifyDatasource(
            @PathVariable("clientId") Long clientId,
            @RequestBody ClientDatasourceVerifyDTO dto) {
        return Result.buildSuc(seatunnelClientService.verifyDatasource(clientId, dto));
    }

    @GetMapping("/instance/{instanceId}/logs")
    public Result<String> logsByInstanceId(
            @PathVariable("instanceId") Long instanceId,
            @RequestParam(value = "jobMode", required = false) String jobMode) {
        return Result.buildSuc(seatunnelClientService.logsByInstanceId(instanceId, jobMode));
    }

    @GetMapping("/{clientId}/jobs/checkpoints/{jobId}")
    public Result<Map<String, Object>> checkpointOverview(
            @PathVariable("clientId") Long clientId,
            @PathVariable("jobId") Long jobId) {
        return Result.buildSuc(
                seatunnelClientService.checkpointOverview(clientId, jobId)
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
                seatunnelClientService.checkpointHistory(
                        clientId,
                        jobId,
                        pipelineId,
                        limit,
                        status
                )
        );
    }

    @GetMapping("/{clientId}/nodes")
    public Result<List<SeaTunnelClientEndpointDTO>> nodes(@PathVariable("clientId") Long clientId) {
        return Result.buildSuc(seatunnelClientService.nodes(clientId));
    }

    @PostMapping("/{clientId}/nodes/refresh")
    public Result<List<SeaTunnelClientEndpointDTO>> refreshNodes(@PathVariable("clientId") Long clientId) {
        return Result.buildSuc(seatunnelClientService.refreshNodes(clientId));
    }
}
