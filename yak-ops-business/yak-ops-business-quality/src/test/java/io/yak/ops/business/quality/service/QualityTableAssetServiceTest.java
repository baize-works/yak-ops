package io.yak.ops.business.quality.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityApi.RegisterTableItem;
import io.yak.ops.business.quality.api.QualityApi.RegisterTablesRequest;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetTarget;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetWrite;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class QualityTableAssetServiceTest {

  @Mock
  private QualityRepository repository;

  @Mock
  private DataSourceCatalogService catalogService;

  private QualityTableAssetService service;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    service = new QualityTableAssetService(repository, catalogService);
  }

  @Test
  void shouldReturnOnlyUnregisteredPluginTables() {
    when(repository.listTableAssetTargets(1L, "demo"))
        .thenReturn(List.of(new TableAssetTarget("demo", null, "registered_table")));
    when(catalogService.listTables(1L, "demo", null, null))
        .thenReturn(List.of(
            table("registered_table", "已注册"),
            table("order_info", "订单表"),
            table("user_info", "用户表")));

    var result = service.candidates(1L, "demo", null, null, 1, 20);

    assertThat(result.total()).isEqualTo(2);
    assertThat(result.records())
        .extracting(record -> record.tableName())
        .containsExactly("order_info", "user_info");
  }

  @Test
  void shouldPersistMetadataReturnedByDatasourcePlugin() {
    DataSourceCatalogTableVO physicalTable = table("user_info", "插件中的用户表描述");
    when(catalogService.listTables(1L, "demo", null, null))
        .thenReturn(List.of(physicalTable));
    when(repository.registerTableAssets(anyList())).thenReturn(1);

    var result = service.register(
        new RegisterTablesRequest(
            1L,
            "测试数据源",
            "demo",
            List.of(new RegisterTableItem(
                "demo", null, "user_info", "CLIENT_VALUE", "客户端描述"))),
        "tester");

    ArgumentCaptor<List<TableAssetWrite>> captor = ArgumentCaptor.forClass(List.class);
    verify(repository).registerTableAssets(captor.capture());
    TableAssetWrite write = captor.getValue().get(0);
    assertThat(write.tableType()).isEqualTo("TABLE");
    assertThat(write.remarks()).isEqualTo("插件中的用户表描述");
    assertThat(write.registeredBy()).isEqualTo("tester");
    assertThat(result.registered()).isEqualTo(1);
  }

  @Test
  void shouldBlockUnregisterWhenMonitorExists() {
    when(repository.countMonitorsForTableAsset(10L)).thenReturn(1);

    assertThatThrownBy(() -> service.unregister(10L))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("先删除监控");
  }

  private DataSourceCatalogTableVO table(String name, String remarks) {
    return new DataSourceCatalogTableVO("demo", null, name, "TABLE", remarks);
  }
}
