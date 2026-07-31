package io.yak.ops.business.resource.service;

import io.yak.framework.common.PagingData;
import io.yak.ops.business.resource.model.ResourceDownload;
import io.yak.ops.common.bean.dto.resource.ResourceContentUpdateDTO;
import io.yak.ops.common.bean.dto.resource.ResourceCreateContentDTO;
import io.yak.ops.common.bean.dto.resource.ResourceCreateDirectoryDTO;
import io.yak.ops.common.bean.dto.resource.ResourceMoveDTO;
import io.yak.ops.common.bean.dto.resource.ResourceQueryDTO;
import io.yak.ops.common.bean.dto.resource.ResourceUpdateDTO;
import io.yak.ops.common.bean.vo.resource.ResourceContentVO;
import io.yak.ops.common.bean.vo.resource.ResourceStoragePluginVO;
import io.yak.ops.common.bean.vo.resource.ResourceVO;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

/** 资源管理服务。 */
public interface ResourceService {

  ResourceVO createDirectory(ResourceCreateDirectoryDTO requestDTO);

  ResourceVO upload(Long parentId, String name, String description, MultipartFile file);

  ResourceVO createContent(ResourceCreateContentDTO requestDTO);

  ResourceVO get(Long id);

  List<ResourceVO> list(Long parentId, String keyword);

  PagingData<ResourceVO> page(ResourceQueryDTO queryDTO);

  List<ResourceVO> tree();

  ResourceVO update(Long id, ResourceUpdateDTO requestDTO);

  ResourceVO replaceFile(Long id, MultipartFile file);

  ResourceContentVO updateContent(Long id, ResourceContentUpdateDTO requestDTO);

  ResourceContentVO getContent(Long id, int skipLineNum, int limit);

  ResourceVO move(Long id, ResourceMoveDTO requestDTO);

  boolean delete(Long id);

  ResourceDownload download(Long id);

  List<ResourceStoragePluginVO> storagePlugins();
}
