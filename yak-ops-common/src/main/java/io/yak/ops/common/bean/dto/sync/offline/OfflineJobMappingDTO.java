package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Data;

/**
 * 离线同步任务级字段映射配置。
 *
 * @author weifuwan
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobMappingDTO {

  private List<OfflineJobColumnMappingDTO> columns;
}
