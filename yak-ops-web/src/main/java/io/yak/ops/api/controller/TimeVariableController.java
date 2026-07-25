package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import io.yak.ops.application.service.TimeVariableService;
import io.yak.ops.application.support.time.DefaultTimeVariableRenderService;
import io.yak.ops.dao.entity.TimeVariable;
import io.yak.ops.web.contract.dto.TimeVariableCreateDTO;
import io.yak.ops.web.contract.dto.TimeVariablePageReq;
import io.yak.ops.web.contract.dto.TimeVariablePreviewReq;
import io.yak.ops.web.contract.dto.TimeVariableRenderReq;
import io.yak.ops.web.contract.dto.TimeVariableUpdateDTO;
import io.yak.ops.web.contract.response.PaginationResult;
import io.yak.ops.web.contract.response.Result;
import io.yak.ops.web.contract.vo.OptionVO;
import io.yak.ops.web.contract.vo.TimeVariablePreviewVO;
import io.yak.ops.web.contract.vo.TimeVariableRenderVO;
import io.yak.ops.web.contract.vo.TimeVariableVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/time-variable")
@Tag(name = "TIME_VARIABLE_TAG")
public class TimeVariableController {

    @Resource
    private TimeVariableService timeVariableService;

    @Resource
    private DefaultTimeVariableRenderService defaultTimeVariableRenderService;

    @PostMapping("/page")
    @Operation(summary = "分页查询时间变量")
    public PaginationResult<TimeVariableVO> page(@RequestBody TimeVariablePageReq req) {
        return timeVariableService.pageQuery(req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询时间变量详情")
    public Result<TimeVariableVO> getById(@PathVariable Long id) {
        return Result.buildSuc(timeVariableService.getById(id));
    }

    @PostMapping
    @Operation(summary = "新增时间变量")
    public Result<Long> create(@RequestBody TimeVariableCreateDTO dto) {
        return Result.buildSuc(timeVariableService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "修改时间变量")
    public Result<Boolean> update(@PathVariable Long id, @RequestBody TimeVariableUpdateDTO dto) {
        return Result.buildSuc(timeVariableService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除时间变量")
    public Result<Boolean> delete(@PathVariable Long id) {
        timeVariableService.delete(id);
        return Result.buildSuc(true);
    }

    @PostMapping("/preview")
    @Operation(summary = "预览时间表达式")
    public Result<TimeVariablePreviewVO> preview(@RequestBody TimeVariablePreviewReq req) {
        return Result.buildSuc(timeVariableService.preview(req));
    }

    @PostMapping("/render")
    @Operation(summary = "渲染 HOCON 中的时间变量")
    public Result<TimeVariableRenderVO> render(@RequestBody TimeVariableRenderReq req) {
        return Result.buildSuc(defaultTimeVariableRenderService.render(req));
    }

    @GetMapping("/list")
    @Operation(summary = "获取所有时间变量")
    public Result<List<OptionVO>> getAllTimeVariables() {
        List<TimeVariable> timeVariables = defaultTimeVariableRenderService.getAllEnabledVariables();
        List<OptionVO> optionVOList = timeVariables.stream().map(timeVariable -> {
            OptionVO option = new OptionVO();
            option.setValue(timeVariable.getId()+"");
            option.setLabel(timeVariable.getParamName());
            option.setDescription(timeVariable.getExpression());
            return option;
        }).collect(java.util.stream.Collectors.toList());

        return Result.buildSuc(optionVOList);
    }
}
