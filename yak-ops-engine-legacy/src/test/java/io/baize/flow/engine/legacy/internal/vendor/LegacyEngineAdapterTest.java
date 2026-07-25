package io.baize.flow.engine.legacy.internal.vendor;

import io.baize.flow.engine.api.*;
import io.baize.flow.engine.contract.testkit.EngineAdapterContract;
import java.util.List;
import java.util.Map;

/** SeaTunnel opts into the mandatory adapter acceptance suite. */
class LegacyEngineAdapterTest extends EngineAdapterContract {
    @Override protected Harness harness() {
        Stub client=new Stub(); LegacyEngineAdapter gateway=new LegacyEngineAdapter(client);
        EngineEndpoint endpoint=new EngineEndpoint(new ExecutionEngine("legacy"),"1","http://engine",null,java.util.Collections.emptyMap());
        return new Harness() {
            public EngineGateway gateway(){return gateway;} public EngineEndpoint endpoint(){return endpoint;}
            public JobSubmitCommand command(String key){return new JobSubmitCommand(endpoint,"env {}",java.util.Collections.singletonMap("fileName", "job.conf"),key);}
            public void vendorStatus(String status){client.status=status;} public void timeoutQueries(){client.timeout=true;}
            public boolean cancellationObserved(){return client.cancelled;}
        };
    }
    static class Stub implements SeaTunnelEngineClient {
        String status="SUBMITTED"; boolean timeout; boolean cancelled; int sequence;
        public SeaTunnelSubmitResponse submit(long id,byte[] config,String file){return new SeaTunnelSubmitResponse("job-"+(++sequence));}
        public SeaTunnelJobResponse job(long id,String job){if(timeout)throw new IllegalStateException("read timed out");return new SeaTunnelJobResponse(status,null,java.util.Collections.emptyList(),java.util.Collections.emptyList());}
        public SeaTunnelMetricsResponse metrics(long id,String job){return new SeaTunnelMetricsResponse(java.util.Collections.singletonMap("records", 9));}
        public void cancel(long id,String job){cancelled=true;} public void probe(long id){}
    }
}
