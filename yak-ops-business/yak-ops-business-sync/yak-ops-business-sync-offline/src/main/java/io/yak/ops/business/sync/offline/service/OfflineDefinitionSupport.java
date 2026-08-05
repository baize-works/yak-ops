package io.yak.ops.business.sync.offline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.engine.LinkUpJobSpecFactory;
import io.yak.ops.business.sync.offline.engine.OfflineDefinitionModelAdapter;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobDefinitionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 离线同步任务定义序列化与 JobSpec 构建。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineDefinitionSupport {
  private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
  private final LinkUpJobSpecFactory jobSpecFactory;
  private final DataSourceDao dataSourceDao;
  private final ObjectMapper objectMapper;

  public OfflineDefinitionSupport(LinkUpJobSpecFactory jobSpecFactory, DataSourceDao dataSourceDao,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.jobSpecFactory=jobSpecFactory; this.dataSourceDao=dataSourceDao; this.objectMapper=objectMapper;
  }

  public PreparedDefinition prepare(OfflineJobDefinitionDTO dto) {
    ObjectNode request=object(dto); JsonNode basic=request.path("basic");
    String name=requiredText(basic,"jobName","任务名称不能为空"); String mode=mode(basic);
    JsonNode buildRequest=OfflineDefinitionModelAdapter.forJobSpec(request,objectMapper);
    LinkUpJobSpecFactory.BuildResult result=jobSpecFactory.build(buildRequest);
    return new PreparedDefinition(request,name.trim(),trim(text(basic,"jobDesc",null)),mode,write(request),
        result.getJobSpecJson(),result.getSourceDataSource(),result.getSinkDataSource(),
        result.getSourceConnectorId(),result.getSinkConnectorId(),result.getSourceTable(),result.getSinkTable(),
        digest(result.getJobSpecJson()));
  }

  public DraftDefinition prepareDraft(OfflineJobDefinitionDTO dto) {
    ObjectNode request=object(dto); JsonNode basic=request.path("basic");
    return new DraftDefinition(request,requiredText(basic,"jobName","任务名称不能为空").trim(),
        trim(text(basic,"jobDesc",null)),mode(basic),write(request),
        endpointType(request.path("source"),"来源类型不能为空"),endpointType(request.path("sink"),"目标类型不能为空"));
  }

  public String buildJobSpec(OfflineJobDefinitionDTO dto){return prepare(dto).getJobSpecJson();}
  public String resolveExecutionJobSpec(String logicalJobSpec){return jobSpecFactory.resolveForExecution(logicalJobSpec);}

  public JsonNode editDetail(OfflineJobDefinitionPO d) {
    JsonNode parsed=read(d.getDefinitionJson()); ObjectNode detail=parsed!=null&&parsed.isObject()?(ObjectNode)parsed.deepCopy():objectMapper.createObjectNode();
    detail.put("id",d.getId()); ObjectNode state=detail.with("state");
    state.put("releaseState",d.getReleaseState()); state.put("lastJobStatus",d.getLastJobStatus());
    state.put("lastErrorMessage",d.getLastErrorMessage()); state.set("lastExecutionId",objectMapper.valueToTree(d.getLastExecutionId()));
    state.put("lastEngineJobId",d.getLastEngineJobId()); state.put("draft",!StringUtils.hasText(d.getJobSpecJson()));
    return detail;
  }

  public OfflineJobDefinitionVO toVO(OfflineJobDefinitionPO d) {
    DataSourcePO source=dataSource(d.getSourceDatasourceId()), sink=dataSource(d.getSinkDatasourceId());
    boolean scheduled=Boolean.TRUE.equals(d.getScheduleEnabled());
    return OfflineJobDefinitionVO.builder().id(d.getId()).jobName(d.getJobName()).jobDesc(d.getJobDesc())
        .jobType("BATCH").mode(d.getMode()).releaseState(d.getReleaseState()).sourceType(d.getSourceType()).sinkType(d.getSinkType())
        .sourceDatasourceId(d.getSourceDatasourceId()).sinkDatasourceId(d.getSinkDatasourceId())
        .sourceDatasourceName(source==null?null:source.getName()).sinkDatasourceName(sink==null?null:sink.getName())
        .sourceTable(d.getSourceTable()).sinkTable(d.getSinkTable()).lastJobStatus(d.getLastJobStatus())
        .lastErrorMessage(d.getLastErrorMessage()).instanceId(d.getLastExecutionId()).engineJobId(d.getLastEngineJobId())
        .runMode(scheduled?"SCHEDULE":"MANUAL").duration(seconds(d.getLastDurationMillis())).readRowCount(value(d.getLastReadRowCount()))
        .qps(value(d.getLastQps())).syncSize(formatBytes(d.getLastSyncBytes())).cronExpression(d.getCronExpression())
        .scheduleStatus(scheduled?"NORMAL":"PAUSED").lastScheduleTime(format(d.getScheduleLastFireTime()==null?d.getLastStartTime():d.getScheduleLastFireTime()))
        .nextScheduleTime(format(d.getScheduleNextFireTime())).createTime(format(d.getCreateTime())).updateTime(format(d.getUpdateTime())).build();
  }

  public String writeNullable(JsonNode value){return value==null||value.isNull()||value.isMissingNode()?null:write(value);}
  private ObjectNode object(OfflineJobDefinitionDTO dto){
    if(dto==null)throw new IllegalArgumentException("任务定义不能为空"); JsonNode value=objectMapper.valueToTree(dto);
    if(!value.isObject())throw new IllegalArgumentException("任务定义格式不正确"); ObjectNode request=(ObjectNode)value;
    requireObject(request.path("basic"),"basic 配置不能为空"); normalizeEndpoint(request,"source"); normalizeEndpoint(request,"sink"); normalizeChannel(request);
    OfflineDefinitionModelAdapter.sanitizeForPersistence(request); return request;
  }
  private void normalizeEndpoint(ObjectNode request,String field){JsonNode value=request.get(field);requireObject(value,field+" 配置不能为空");}
  private void normalizeChannel(ObjectNode request){JsonNode value=request.get("channel");ObjectNode channel;
    if(value==null||value.isNull())channel=request.putObject("channel");else{requireObject(value,"channel 配置必须是 JSON 对象");channel=(ObjectNode)value;}
    if(!channel.hasNonNull("parallelism"))channel.put("parallelism",1); if(!channel.hasNonNull("speedLimitEnabled"))channel.put("speedLimitEnabled",false);
    if(!channel.hasNonNull("recordsPerSecond"))channel.put("recordsPerSecond",10000L); if(!channel.hasNonNull("dirtyDataPolicy"))channel.put("dirtyDataPolicy","STOP");
    if(!channel.hasNonNull("dirtyDataLimit"))channel.put("dirtyDataLimit",0L);
  }
  private String mode(JsonNode basic){String value=text(basic,"mode","GUIDE_SINGLE");if(!"GUIDE_SINGLE".equals(value)&&!"GUIDE_MULTI".equals(value))throw new IllegalArgumentException("离线同步仅支持 GUIDE_SINGLE 和 GUIDE_MULTI 模式");return value;}
  private String endpointType(JsonNode endpoint,String message){String value=text(endpoint,"dbType",null);if(!StringUtils.hasText(value))throw new IllegalArgumentException(message);return value.trim();}
  private void requireObject(JsonNode node,String message){if(node==null||!node.isObject())throw new IllegalArgumentException(message);}
  private JsonNode read(String value){if(!StringUtils.hasText(value))return objectMapper.createObjectNode();try{return objectMapper.readTree(value);}catch(JsonProcessingException e){throw new IllegalStateException("任务定义 JSON 已损坏",e);}}
  private String write(JsonNode value){try{return objectMapper.writeValueAsString(value);}catch(JsonProcessingException e){throw new IllegalStateException("序列化任务定义失败",e);}}
  private String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("生成 JobSpec 摘要失败",e);}}
  private String requiredText(JsonNode node,String field,String message){String value=text(node,field,null);if(!StringUtils.hasText(value))throw new IllegalArgumentException(message);return value;}
  private String text(JsonNode node,String field,String fallback){JsonNode value=node==null?null:node.get(field);return value==null||value.isNull()||!value.isValueNode()?fallback:value.asText(fallback);}
  private String trim(String value){return StringUtils.hasText(value)?value.trim():null;} private DataSourcePO dataSource(Long id){return id==null?null:dataSourceDao.selectById(id);}
  private String format(LocalDateTime value){return value==null?null:value.format(FORMAT);} private long seconds(Long millis){return millis==null?0L:Math.max(0,millis/1000L);}
  private long value(Long v){return v==null?0L:v;} private double value(Double v){return v==null?0D:v;}
  private String formatBytes(Long bytes){if(bytes==null||bytes<=0)return "-";double size=bytes;String[] units={"B","KB","MB","GB","TB"};int unit=0;while(size>=1024&&unit<units.length-1){size/=1024;unit++;}return String.format(Locale.ROOT,"%.2f %s",size,units[unit]);}

  public static final class DraftDefinition {
    private final ObjectNode request; private final String jobName,jobDesc,mode,definitionJson,sourceType,sinkType;
    public DraftDefinition(ObjectNode request,String jobName,String jobDesc,String mode,String definitionJson,String sourceType,String sinkType){this.request=request;this.jobName=jobName;this.jobDesc=jobDesc;this.mode=mode;this.definitionJson=definitionJson;this.sourceType=sourceType;this.sinkType=sinkType;}
    public ObjectNode getRequest(){return request;} public String getJobName(){return jobName;} public String getJobDesc(){return jobDesc;} public String getMode(){return mode;}
    public String getDefinitionJson(){return definitionJson;} public String getSourceType(){return sourceType;} public String getSinkType(){return sinkType;}
  }
  public static final class PreparedDefinition {
    private final ObjectNode request; private final String jobName,jobDesc,mode,definitionJson,jobSpecJson,sourceConnectorId,sinkConnectorId,sourceTable,sinkTable,digest;
    private final DataSourcePO source,sink;
    public PreparedDefinition(ObjectNode request,String jobName,String jobDesc,String mode,String definitionJson,String jobSpecJson,DataSourcePO source,DataSourcePO sink,String sourceConnectorId,String sinkConnectorId,String sourceTable,String sinkTable,String digest){this.request=request;this.jobName=jobName;this.jobDesc=jobDesc;this.mode=mode;this.definitionJson=definitionJson;this.jobSpecJson=jobSpecJson;this.source=source;this.sink=sink;this.sourceConnectorId=sourceConnectorId;this.sinkConnectorId=sinkConnectorId;this.sourceTable=sourceTable;this.sinkTable=sinkTable;this.digest=digest;}
    public ObjectNode getRequest(){return request;} public String getJobName(){return jobName;} public String getJobDesc(){return jobDesc;} public String getMode(){return mode;}
    public String getDefinitionJson(){return definitionJson;} public String getJobSpecJson(){return jobSpecJson;} public DataSourcePO getSource(){return source;} public DataSourcePO getSink(){return sink;} public DataSourcePO getSourceDataSource(){return source;} public DataSourcePO getSinkDataSource(){return sink;}
    public String getSourceConnectorId(){return sourceConnectorId;} public String getSinkConnectorId(){return sinkConnectorId;} public String getSourceTable(){return sourceTable;} public String getSinkTable(){return sinkTable;} public String getDigest(){return digest;}
  }
}
