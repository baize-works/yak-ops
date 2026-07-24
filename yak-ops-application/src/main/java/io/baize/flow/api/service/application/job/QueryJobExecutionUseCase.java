package io.baize.flow.api.service.application.job;
import io.baize.flow.api.service.BatchJobInstanceService;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.web.contract.vo.JobInstanceVO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;
/** Reads the persisted execution record; callers never query an engine directly. */
@Component public class QueryJobExecutionUseCase { private final BatchJobInstanceService instances; public QueryJobExecutionUseCase(BatchJobInstanceService instances){this.instances=instances;} public JobInstanceVO query(Long id){ if(id==null||id<=0) throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR,"jobInstanceId"); JobInstanceVO result=instances.selectById(id); if(result==null) throw new ServiceException(Status.BATCH_JOB_INSTANCE_NOT_EXIST); return result;} }
