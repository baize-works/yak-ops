package io.yak.ops.application.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class SeaTunnelClientPageDTO {
    private Integer pageNo;
    private Integer pageSize;
    private String keywords;
    private List<String> engineTypes;
    private List<Integer> healthStatusList;
    private String sortField;
    private String sortType;
}
