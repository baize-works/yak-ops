package io.yak.ops.infrastructure.quartz;

import org.quartz.CronExpression;

import java.text.ParseException;
import java.util.Date;

public final class QuartzScheduleUtils {

    /**
     * 计算下次执行时间
     *
     * @param cronExpression Cron 表达式
     * @return 下次执行时间
     */
    public static Date getNextExecutionTime(String cronExpression) {
        try {
            CronExpression expression = new CronExpression(cronExpression);

            Date now = new Date();

            return expression.getNextValidTimeAfter(now);
        } catch (ParseException e) {
            e.printStackTrace();
            return null;
        }
    }
}
