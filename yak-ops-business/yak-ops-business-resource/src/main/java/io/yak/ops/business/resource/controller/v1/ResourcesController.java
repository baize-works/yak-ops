package io.yak.ops.business.resource.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.PagingResult;
import io.yak.framework.common.Result;
import io.yak.framework.security.web.RequiresPermission;
import io.yak.ops.business.resource.config.ConditionalOnResourceEnabled;
import io.yak.ops.business.resource.model.ResourceDownload;
import io.yak.ops.business.resource.service.ResourceService;
import io.yak.ops.common.bean.dto.resource.ResourceContentUpdateDTO;
import io.yak.ops.common.bean.dto.resource.ResourceCreateContentDTO;
import io.yak.ops.common.bean.dto.resource.ResourceCreateDirectoryDTO;
import io.yak.ops.common.bean.dto.resource.ResourceMoveDTO;
import io.yak.ops.common.bean.dto.resource.ResourceQueryDTO;
import io.yak.ops.common.bean.dto.resource.ResourceUpdateDTO;
import io.yak.ops.common.bean.vo.resource.ResourceContentVO;
import io.yak.ops.common.bean.vo.resource.ResourceStoragePluginVO;
import io.yak.ops.common.bean.vo.resource.ResourceVO;
import io.yak.ops.common.constant.resource.ResourcePermissionCode;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StreamUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 资源目录与文件管理接口。 */
@Tag(name = "资源管理接口")
@RestController
@Validated
@ConditionalOnResourceEnabled
@RequiredArgsConstructor
@RequestMapping("/api/v1/resources")
@RequiresPermission(ResourcePermissionCode.READ)
public class ResourcesController {

  private final ResourceService resourceService;

  @Operation(summary = "创建资源目录")
  @PostMapping("/directory")
  @RequiresPermission(ResourcePermissionCode.CREATE)
  public Result<ResourceVO> createDirectory(
      @Valid @RequestBody ResourceCreateDirectoryDTO requestDTO) {
    return Result.success(resourceService.createDirectory(requestDTO));
  }

  @Operation(summary = "上传资源文件")
  @PostMapping
  @RequiresPermission(ResourcePermissionCode.CREATE)
  public Result<ResourceVO> upload(
      @RequestParam(value = "parentId", required = false, defaultValue = "0") Long parentId,
      @RequestParam(value = "name", required = false) String name,
      @RequestParam(value = "description", required = false) String description,
      @RequestParam("file") MultipartFile file) {
    return Result.success(resourceService.upload(parentId, name, description, file));
  }

  @Operation(summary = "在线创建文本资源")
  @PostMapping("/online-create")
  @RequiresPermission(ResourcePermissionCode.CREATE)
  public Result<ResourceVO> createContent(
      @Valid @RequestBody ResourceCreateContentDTO requestDTO) {
    return Result.success(resourceService.createContent(requestDTO));
  }

  @Operation(summary = "查询资源详情")
  @GetMapping("/{id}")
  public Result<ResourceVO> detail(@PathVariable("id") Long id) {
    return Result.success(resourceService.get(id));
  }

  @Operation(summary = "查询目录直属资源")
  @GetMapping("/list")
  public Result<List<ResourceVO>> list(
      @RequestParam(value = "parentId", required = false, defaultValue = "0") Long parentId,
      @RequestParam(value = "keyword", required = false) String keyword) {
    return Result.success(resourceService.list(parentId, keyword));
  }

  @Operation(summary = "分页查询资源")
  @PostMapping("/page")
  public PagingResult<ResourceVO> page(
      @Valid @RequestBody(required = false) ResourceQueryDTO queryDTO) {
    return PagingResult.success(resourceService.page(queryDTO));
  }

  @Operation(summary = "查询完整资源树")
  @GetMapping("/tree")
  public Result<List<ResourceVO>> tree() {
    return Result.success(resourceService.tree());
  }

  @Operation(summary = "重命名资源或修改描述")
  @PutMapping("/{id}")
  @RequiresPermission(ResourcePermissionCode.UPDATE)
  public Result<ResourceVO> update(
      @PathVariable("id") Long id,
      @Valid @RequestBody ResourceUpdateDTO requestDTO) {
    return Result.success(resourceService.update(id, requestDTO));
  }

  @Operation(summary = "替换资源文件")
  @PutMapping("/{id}/file")
  @RequiresPermission(ResourcePermissionCode.UPDATE)
  public Result<ResourceVO> replaceFile(
      @PathVariable("id") Long id,
      @RequestParam("file") MultipartFile file) {
    return Result.success(resourceService.replaceFile(id, file));
  }

  @Operation(summary = "更新资源文本内容")
  @PutMapping("/{id}/content")
  @RequiresPermission(ResourcePermissionCode.UPDATE)
  public Result<ResourceContentVO> updateContent(
      @PathVariable("id") Long id,
      @Valid @RequestBody ResourceContentUpdateDTO requestDTO) {
    return Result.success(resourceService.updateContent(id, requestDTO));
  }

  @Operation(summary = "分页查看资源文本内容")
  @GetMapping("/{id}/content")
  public Result<ResourceContentVO> content(
      @PathVariable("id") Long id,
      @RequestParam(value = "skipLineNum", defaultValue = "0")
      @Min(value = 0, message = "跳过行数不能小于 0") int skipLineNum,
      @RequestParam(value = "limit", defaultValue = "200")
      @Min(value = 1, message = "读取行数必须大于 0")
      @Max(value = 2000, message = "单次读取不能超过 2000 行") int limit) {
    return Result.success(resourceService.getContent(id, skipLineNum, limit));
  }

  @Operation(summary = "移动资源")
  @PostMapping("/{id}/move")
  @RequiresPermission(ResourcePermissionCode.UPDATE)
  public Result<ResourceVO> move(
      @PathVariable("id") Long id,
      @Valid @RequestBody ResourceMoveDTO requestDTO) {
    return Result.success(resourceService.move(id, requestDTO));
  }

  @Operation(summary = "递归删除资源")
  @DeleteMapping("/{id}")
  @RequiresPermission(ResourcePermissionCode.DELETE)
  public Result<Boolean> delete(@PathVariable("id") Long id) {
    return Result.success(resourceService.delete(id));
  }

  @Operation(summary = "下载资源文件")
  @GetMapping("/{id}/download")
  @RequiresPermission(ResourcePermissionCode.DOWNLOAD)
  public void download(
      @PathVariable("id") Long id,
      HttpServletResponse response) throws IOException {
    ResourceDownload download = resourceService.download(id);
    response.setContentType(download.getContentType());
    if (download.getFileSize() >= 0L) {
      response.setContentLengthLong(download.getFileSize());
    }
    String encodedName = URLEncoder.encode(download.getFileName(), StandardCharsets.UTF_8)
        .replace("+", "%20");
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION,
        "attachment; filename*=UTF-8''" + encodedName);
    try (InputStream inputStream = download.getInputStream()) {
      StreamUtils.copy(inputStream, response.getOutputStream());
      response.flushBuffer();
    }
  }

  @Operation(summary = "查询已安装存储插件")
  @GetMapping("/storage-plugins")
  public Result<List<ResourceStoragePluginVO>> storagePlugins() {
    return Result.success(resourceService.storagePlugins());
  }
}
