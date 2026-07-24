package io.baize.flow.api.controller;


import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.annotation.Resource;
import io.baize.flow.api.service.SeaTunnelClientService;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.web.contract.dto.ClientDatasourceVerifyDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientEndpointDTO;
import io.baize.flow.web.contract.dto.SeaTunnelClientPageDTO;
import io.baize.flow.web.contract.response.Result;
import io.baize.flow.web.contract.vo.ClientDatasourceVerifyVO;
import io.baize.flow.web.contract.vo.OptionVO;
import io.baize.flow.web.contract.vo.SeaTunnelClientMetricsVO;
import io.baize.flow.web.contract.vo.SeaTunnelClientVO;
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