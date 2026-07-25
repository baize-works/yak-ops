
package io.yak.ops.common.utils;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;


public class IdWorkerUtil {

    /**
     * 主机和进程的机器码
     */
    private static Sequence WORKER = new Sequence();

    public static long getId() {
        return WORKER.nextId();
    }

    public static String getIdStr() {
        return String.valueOf(WORKER.nextId());
    }

    /**
     * <p>
     * 有参构造器
     * </p>
     *
     * @param workerId     工作机器 ID
     * @param datacenterId 序列号
     */
    public static void initSequence(long workerId, long datacenterId) {
        WORKER = new Sequence(workerId, datacenterId);
    }

    /**
     * <p>
     * 使用ThreadLocalRandom获取UUID获取更优的效果 去掉"-"
     * </p>
     */
    public static String get32UUID() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return new UUID(random.nextLong(), random.nextLong()).toString().replace("-", "");
    }


    public static void main(String[] args) {
        System.out.println(get32UUID());
        System.out.println(getId());
        System.out.println(getIdStr());
    }

}
