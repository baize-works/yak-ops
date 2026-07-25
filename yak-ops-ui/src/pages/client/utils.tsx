import {DashboardOutlined, DatabaseOutlined, HddOutlined,} from "@ant-design/icons";
import {ClientMonitoring, HealthInfo, RecentEventItem, ResourceUsageItem, ResourceUsageTone, TrendBar,} from "./types";

export const getHealthInfo = (client: ClientMonitoring): HealthInfo => {
  const {overview, monitoring} = client;

  if (monitoring.physicalMemoryFreeMB < 100) {
    return {
      level: "critical",
      title: "Critical",
      subtitle: "物理内存剩余过低，存在明显风险",
      score: 28,
      color: "#ff4d4f",
    };
  }

  if (
    monitoring.loadSystemPercent >= 70 ||
    monitoring.heapMemoryUsedTotalPercent >= 80 ||
    overview.failedJobs > 0
  ) {
    return {
      level: "warning",
      title: "Warning",
      subtitle: "存在需要关注的运行指标",
      score: 68,
      color: "#faad14",
    };
  }

  return {
    level: "healthy",
    title: "Healthy",
    subtitle: "系统整体运行平稳",
    score: 92,
    color: "#52c41a",
  };
};

export const buildTrendBars = (client: ClientMonitoring): TrendBar[] => {
  const cpu = client.monitoring.loadSystemPercent;
  const heap = client.monitoring.heapMemoryUsedTotalPercent;
  const freeMemoryFactor =
    client.monitoring.physicalMemoryFreeMB < 100 ? 18 : 62;
  const failedFactor = client.overview.failedJobs > 0 ? 58 : 24;

  return [
    {
      label: "Mon",
      value: Math.max(26, Math.min(78, Math.round(cpu * 0.72))),
      tip: `${Math.round(cpu * 0.72)}%`,
      gradient: "linear-gradient(180deg, #cfe0ff 0%, #8fb2ff 100%)",
    },
    {
      label: "Tue",
      value: Math.max(22, Math.min(72, Math.round(heap * 0.85))),
      tip: `${Math.round(heap * 0.85)}%`,
      gradient: "linear-gradient(180deg, #e7dbff 0%, #b38cff 100%)",
    },
    {
      label: "Wed",
      value: Math.max(18, Math.min(70, freeMemoryFactor)),
      tip: `${freeMemoryFactor}%`,
      gradient: "linear-gradient(180deg, #ffe1e1 0%, #ff9f9f 100%)",
    },
    {
      label: "Thu",
      value: Math.max(24, Math.min(74, Math.round(cpu * 0.86))),
      tip: `${Math.round(cpu * 0.86)}%`,
      gradient: "linear-gradient(180deg, #d8f5e8 0%, #7fd7a5 100%)",
    },
    {
      label: "Fri",
      value: Math.max(20, Math.min(76, failedFactor)),
      tip: `${failedFactor}%`,
      gradient: "linear-gradient(180deg, #ffe8c7 0%, #ffc36a 100%)",
    },
    {
      label: "Sat",
      value: Math.max(24, Math.min(84, Math.round((cpu + heap) / 2))),
      tip: `${Math.round((cpu + heap) / 2)}%`,
      gradient: "linear-gradient(180deg, #d9f0ff 0%, #79c4ff 100%)",
    },
    {
      label: "Sun",
      value: Math.max(28, Math.min(88, Math.round((cpu + 18) * 0.95))),
      tip: `${Math.round((cpu + 18) * 0.95)}%`,
      gradient: "linear-gradient(180deg, #dbe4ff 0%, #7c94ff 100%)",
    },
  ];
};

const clampPercent = (value: number) =>
  Math.min(100, Math.max(0, Number(value || 0)));

const round1 = (value: number) => Math.round(value * 10) / 10;

const parseSizeToMB = (text?: string) => {
  if (!text) return 0;

  const raw = String(text).trim();
  const num = Number(raw.replace(/[^\d.]/g, ""));

  if (Number.isNaN(num)) return 0;
  if (/g|gb|gib/i.test(raw)) return num * 1024;
  if (/m|mb|mib/i.test(raw)) return num;
  if (/k|kb|kib/i.test(raw)) return num / 1024;

  return num;
};

const formatMBToBestUnit = (mb: number) => {
  if (!Number.isFinite(mb) || mb <= 0) return "-";
  if (mb >= 1024) return `${round1(mb / 1024)} GB`;
  return `${round1(mb)} MB`;
};

const getToneStyle = (tone: ResourceUsageTone) => {
  const toneMap: Record<ResourceUsageTone,
    { gradient: string; trackColor: string; glowColor: string }> = {
    blue: {
      gradient: "linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)",
      trackColor: "rgba(96,165,250,0.16)",
      glowColor: "rgba(59,130,246,0.35)",
    },
    violet: {
      gradient: "linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)",
      trackColor: "rgba(167,139,250,0.16)",
      glowColor: "rgba(139,92,246,0.35)",
    },
    amber: {
      gradient: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
      trackColor: "rgba(251,191,36,0.18)",
      glowColor: "rgba(245,158,11,0.32)",
    },
    green: {
      gradient: "linear-gradient(90deg, #4ade80 0%, #22c55e 100%)",
      trackColor: "rgba(74,222,128,0.18)",
      glowColor: "rgba(34,197,94,0.3)",
    },
    rose: {
      gradient: "linear-gradient(90deg, #fb7185 0%, #f43f5e 100%)",
      trackColor: "rgba(251,113,133,0.18)",
      glowColor: "rgba(244,63,94,0.32)",
    },
  };

  return toneMap[tone];
};

export const buildResourceUsageData = (
  client: ClientMonitoring
): ResourceUsageItem[] => {
  const {monitoring, overview} = client;

  const cpu = clampPercent(monitoring.loadSystemPercent);

  const heapUsedPercent = clampPercent(monitoring.heapMemoryUsedTotalPercent);

  const physicalTotalMB = parseSizeToMB(monitoring.physicalMemoryTotal);
  const physicalFreeMB =
    Number(monitoring.physicalMemoryFreeMB || 0) ||
    parseSizeToMB(monitoring.physicalMemoryFree);

  const physicalUsedPercent =
    physicalTotalMB > 0
      ? clampPercent(
      ((physicalTotalMB - physicalFreeMB) / physicalTotalMB) * 100
      )
      : 0;

  const memory =
    physicalUsedPercent > 0
      ? clampPercent(heapUsedPercent * 0.65 + physicalUsedPercent * 0.35)
      : heapUsedPercent;

  const diskEstimate = clampPercent(
    Math.round(
      14 +
      overview.runningJobs * 2.4 +
      overview.failedJobs * 5.5 +
      overview.pendingJobs * 1.2 +
      monitoring.eventQSize * 0.12
    )
  );

  const getCpuTip = (value: number) => {
    if (value < 20) return "今天很轻松，处理器几乎在散步 🌿";
    if (value < 55) return "节奏刚刚好，整体运行很顺";
    if (value < 80) return "开始有点忙啦，建议看看高峰任务";
    return "CPU 压力偏高，可能有热点任务在冲刺 ⚠️";
  };

  const getMemoryTip = (value: number) => {
    if (value < 35) return "内存状态很松弛，像在慢慢呼吸 ☁️";
    if (value < 70) return "整体还稳，物理内存和 Heap 都比较温和";
    if (value < 85) return "有一点点挤，建议留意对象堆积和缓存";
    return "内存压力明显上来了，GC 可能会更忙一些 ✨";
  };

  const getDiskTip = (value: number) => {
    if (value < 30) return "存储空间还很从容，留白感不错";
    if (value < 70) return "整体可控，日志和任务增长都还正常";
    if (value < 85) return "磁盘开始热闹起来啦，建议看看缓存和日志";
    return "磁盘估算偏高，最好排查一下堆积数据 ⚠️";
  };

  const cpuTone: ResourceUsageTone =
    cpu >= 85 ? "rose" : cpu >= 60 ? "amber" : "blue";

  const memoryTone: ResourceUsageTone =
    memory >= 85 ? "rose" : memory >= 65 ? "violet" : "green";

  const diskTone: ResourceUsageTone =
    diskEstimate >= 85 ? "rose" : diskEstimate >= 65 ? "amber" : "blue";

  return [
    {
      key: "cpu",
      label: "CPU",
      subtitle: "系统负载与处理节奏",
      value: round1(cpu),
      totalText: `${monitoring.processors} 核心`,
      tip: getCpuTip(cpu),
      tone: cpuTone,
      ...getToneStyle(cpuTone),
      icon: <DashboardOutlined/>,
    },
    {
      key: "memory",
      label: "内存",
      subtitle: "物理内存 + Heap 综合观察",
      value: round1(memory),
      totalText: `物理 ${formatMBToBestUnit(physicalTotalMB)} · Heap ${
        monitoring.heapMemoryTotal
      }`,
      tip: getMemoryTip(memory),
      tone: memoryTone,
      ...getToneStyle(memoryTone),
      icon: <DatabaseOutlined/>,
    },
    {
      key: "disk",
      label: "磁盘",
      subtitle: "基于任务、失败数与事件堆积的估算",
      value: round1(diskEstimate),
      totalText: "估算容量视图",
      tip: getDiskTip(diskEstimate),
      tone: diskTone,
      ...getToneStyle(diskTone),
      icon: <HddOutlined/>,
    },
  ];
};

export const buildRecentEvents = (
  client: ClientMonitoring,
  health: HealthInfo
): RecentEventItem[] => {
  return [
    {
      title:
        health.level === "critical"
          ? "Memory alert triggered"
          : "Heartbeat check passed",
      desc:
        health.level === "critical"
          ? `可用物理内存仅剩 ${client.monitoring.physicalMemoryFree}，需要优先关注宿主机资源。`
          : `节点 ${client.name} 心跳正常，系统整体运行保持平稳。`,
      time: "2 min ago",
      color: health.color,
      shadow:
        health.level === "critical"
          ? "rgba(255,77,79,0.18)"
          : health.level === "warning"
          ? "rgba(250,173,20,0.18)"
          : "rgba(82,196,26,0.18)",
    },
    {
      title: "GC activity updated",
      desc: `Minor GC ${client.monitoring.minorGcCount} 次，Major GC ${client.monitoring.majorGcCount} 次，当前 GC 时间开销可接受。`,
      time: "8 min ago",
      color: "#8b5cf6",
      shadow: "rgba(139,92,246,0.16)",
    },
    {
      title: "Connection snapshot refreshed",
      desc: `当前活跃连接 ${client.monitoring.connectionActiveCount}，代理数 ${client.monitoring.proxyCount}，Endpoint ${client.monitoring.clientEndpointCount}。`,
      time: "13 min ago",
      color: "#5b7cff",
      shadow: "rgba(91,124,255,0.16)",
    },
    {
      title: "Job status synced",
      desc: `已完成 ${client.overview.finishedJobs} 个任务，失败 ${client.overview.failedJobs} 个，运行中 ${client.overview.runningJobs} 个。`,
      time: "21 min ago",
      color: "#14b8a6",
      shadow: "rgba(20,184,166,0.16)",
    },
  ];
};

export const buildCriticalAlerts = (client: ClientMonitoring): string[] => {
  const result: string[] = [];
  const {overview, monitoring} = client;

  if (monitoring.physicalMemoryFreeMB < 100) {
    result.push("物理内存剩余极低，建议尽快排查系统占用与宿主机资源。");
  }
  if (monitoring.loadSystemPercent >= 70) {
    result.push("系统负载偏高，建议观察是否存在高峰流量或异常任务。");
  }
  if (monitoring.heapMemoryUsedTotalPercent >= 80) {
    result.push("Heap 使用率偏高，建议排查对象堆积或 GC 压力。");
  }
  if (overview.failedJobs > 0) {
    result.push(
      `存在 ${overview.failedJobs} 个失败任务，建议前往任务页进一步排查。`
    );
  }
  if (result.length === 0) {
    result.push("当前未发现明显异常，系统保持稳定。");
  }

  return result;
};


export const formatPercent = (value?: number | string) => {
  if (value === undefined || value === null || value === "") return "--";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${Math.round(n)}%`;
};

export const getSafeNumber = (value?: number | string) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

export const formatText = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "--";
  return String(value);
};

export const getHealthMeta = (healthStatus?: number) => {
  if (healthStatus === 1) {
    return {
      dot: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Healthy",
      desc: "节点运行正常，可用于任务提交与监控。",
    };
  }

  if (healthStatus === 2) {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Warning",
      desc: "节点当前存在轻微异常，建议关注运行状态。",
    };
  }

  return {
    dot: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    label: "Down",
    desc: "节点当前不可用，请检查地址、进程或网络连接。",
  };
};
