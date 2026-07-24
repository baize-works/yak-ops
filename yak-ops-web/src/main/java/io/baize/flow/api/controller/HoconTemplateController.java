package io.baize.flow.api.controller;

import lombok.RequiredArgsConstructor;
import io.baize.flow.api.service.HoconTemplateService;
import io.baize.flow.web.contract.response.Result;
import io.baize.flow.web.contract.vo.HoconTemplateVO;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hocon-template")
@RequiredArgsConstructor
public class HoconTemplateController {

    private final HoconTemplateService hoconTemplateService;

    @GetMapping("/preview")
    public Result<HoconTemplateVO> preview(
            @RequestParam("sourceDbType") DbType sourceDbType,
            @RequestParam("sourcePluginName") String sourcePluginName,
            @RequestParam("targetDbType") DbType targetDbType,
            @RequestParam("targetPluginName") String targetPluginName
    ) {
        return Result.buildSuc(hoconTemplateService.getTemplate(
                sourceDbType,
                sourcePluginName,
                targetDbType,
                targetPluginName
        ));
    }
}