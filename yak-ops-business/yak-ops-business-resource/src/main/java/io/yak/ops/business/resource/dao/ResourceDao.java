package io.yak.ops.business.resource.dao;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.bean.dto.resource.ResourceQueryDTO;
import io.yak.ops.common.bean.po.resource.ResourcePO;
import java.util.List;

/** 资源数据访问接口。 */
public interface ResourceDao {

  int insert(ResourcePO resourcePO);

  boolean update(ResourcePO resourcePO);

  ResourcePO selectById(Long id);

  ResourcePO selectByFullPath(String fullPath);

  boolean existsByParentAndName(Long parentId, String name, Long excludeId);

  List<ResourcePO> selectChildren(Long parentId, String keyword);

  List<ResourcePO> selectAll();

  List<ResourcePO> selectDescendants(String fullPath);

  IPage<ResourcePO> selectPage(ResourceQueryDTO queryDTO);

  boolean updateBatch(List<ResourcePO> resources);

  boolean deleteBatch(List<Long> ids);
}
