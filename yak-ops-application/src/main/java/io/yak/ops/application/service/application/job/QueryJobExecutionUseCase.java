package io.yak.ops.application.service.application.job;
import io.yak.ops.application.service.BatchJobInstanceService;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.web.contract.vo.JobInstanceVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;
/** Reads the persisted execution record; callers never query an engine directly. */
@Component public class QueryJobExecutionUseCase { private final BatchJobInstanceService instances; public QueryJobExecutionUseCase(BatchJobInstanceService instances){this.instances=instances;} public JobInstanceVO query(Long id){ if(id==null||id<=0) throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,"jobInstanceId"); JobInstanceVO result=instances.selectById(id); if(result==null) throw new ServiceException(Status.BATCH_JOB_INSTANCE_NOT_EXIST); return result;} }
