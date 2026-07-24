package io.baize.flow.domain.cron;

import com.cronutils.model.Cron;
import io.baize.flow.common.enums.CycleEnum;

import java.util.ArrayList;
import java.util.List;

/**
 * DAG Cycle judge
 */
public class CycleLinks extends AbstractCycle {
    private final List<AbstractCycle> cycleList = new ArrayList<>();

    public CycleLinks(Cron cron) {
        super(cron);
    }

    /**
     * add cycle
     *
     * @param cycle cycle
     * @return CycleLinks
     */
    @Override
    public CycleLinks addCycle(AbstractCycle cycle) {
        cycleList.add(cycle);
        return this;
    }

    /**
     * get cycle
     *
     * @return CycleEnum
     */
    @Override
    protected CycleEnum getCycle() {
        for (AbstractCycle abstractCycle : cycleList) {
            CycleEnum cycle = abstractCycle.getCycle();
            if (cycle != null) {
                return cycle;
            }
        }

        return null;
    }

    /**
     * get mini cycle
     *
     * @return CycleEnum
     */
    @Override
    protected CycleEnum getMiniCycle() {
        for (AbstractCycle cycleHelper : cycleList) {
            CycleEnum cycle = cycleHelper.getMiniCycle();
            if (cycle != null) {
                return cycle;
            }
        }

        return null;
    }
}