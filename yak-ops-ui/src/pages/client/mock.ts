import {ClientMonitoring} from "./types";

export const mockClients: ClientMonitoring[] = [
  {
    id: "client-1",
    name: "Prod Cluster A",
    engineType: "Zeta",
    region: "cn-hangzhou",
    version: "2.3.1",
    commit: "a91bcf2",
    statusText: "Running",

    overview: {
      projectVersion: "2.3.1",
      gitCommitAbbrev: "a91bcf2",
      totalSlot: 128,
      unassignedSlot: 42,
      works: 18,
      runningJobs: 6,
      pendingJobs: 3,
      finishedJobs: 128,
      failedJobs: 0,
      cancelledJobs: 2,
    },

    monitoring: {
      processors: 16,
      physicalMemoryTotal: "64 GB",
      physicalMemoryFree: "28 GB",
      physicalMemoryFreeMB: 28672,

      swapSpaceTotal: "16 GB",
      swapSpaceFree: "15 GB",

      heapMemoryUsed: "3.2 GB",
      heapMemoryTotal: "8 GB",
      heapMemoryMax: "8 GB",
      heapMemoryUsedTotalPercent: 40,
      heapMemoryUsedMaxPercent: 40,

      minorGcCount: 32,
      minorGcTime: "1.2s",
      majorGcCount: 2,
      majorGcTime: "0.3s",

      loadProcessPercent: 22,
      loadSystemPercent: 35,
      loadSystemAverage: 1.8,

      threadCount: 48,
      threadPeakCount: 72,

      clusterTimeDiff: 3,
      eventQSize: 12,

      proxyCount: 2,
      clientEndpointCount: 4,
      connectionActiveCount: 3,
      clientConnectionCount: 6,
      connectionCount: 10,
    },
  },

  {
    id: "client-2",
    name: "Test Cluster B",
    engineType: "Zeta",
    region: "cn-beijing",
    version: "2.3.0",
    commit: "c82fa11",
    statusText: "Running",

    overview: {
      projectVersion: "2.3.0",
      gitCommitAbbrev: "c82fa11",
      totalSlot: 96,
      unassignedSlot: 10,
      works: 26,
      runningJobs: 9,
      pendingJobs: 5,
      finishedJobs: 86,
      failedJobs: 2,
      cancelledJobs: 4,
    },

    monitoring: {
      processors: 12,
      physicalMemoryTotal: "48 GB",
      physicalMemoryFree: "6 GB",
      physicalMemoryFreeMB: 6144,

      swapSpaceTotal: "12 GB",
      swapSpaceFree: "8 GB",

      heapMemoryUsed: "6.5 GB",
      heapMemoryTotal: "8 GB",
      heapMemoryMax: "8 GB",
      heapMemoryUsedTotalPercent: 82,
      heapMemoryUsedMaxPercent: 82,

      minorGcCount: 88,
      minorGcTime: "4.6s",
      majorGcCount: 8,
      majorGcTime: "2.1s",

      loadProcessPercent: 48,
      loadSystemPercent: 72,
      loadSystemAverage: 3.6,

      threadCount: 96,
      threadPeakCount: 140,

      clusterTimeDiff: 8,
      eventQSize: 38,

      proxyCount: 3,
      clientEndpointCount: 6,
      connectionActiveCount: 6,
      clientConnectionCount: 12,
      connectionCount: 18,
    },
  },

  {
    id: "client-3",
    name: "Edge Cluster C",
    engineType: "Zeta",
    region: "cn-shanghai",
    version: "2.2.8",
    commit: "9fa221c",
    statusText: "Degraded",

    overview: {
      projectVersion: "2.2.8",
      gitCommitAbbrev: "9fa221c",
      totalSlot: 64,
      unassignedSlot: 2,
      works: 34,
      runningJobs: 12,
      pendingJobs: 8,
      finishedJobs: 52,
      failedJobs: 6,
      cancelledJobs: 5,
    },

    monitoring: {
      processors: 8,
      physicalMemoryTotal: "32 GB",
      physicalMemoryFree: "0.8 GB",
      physicalMemoryFreeMB: 820,

      swapSpaceTotal: "8 GB",
      swapSpaceFree: "1.2 GB",

      heapMemoryUsed: "7.6 GB",
      heapMemoryTotal: "8 GB",
      heapMemoryMax: "8 GB",
      heapMemoryUsedTotalPercent: 95,
      heapMemoryUsedMaxPercent: 95,

      minorGcCount: 210,
      minorGcTime: "12.4s",
      majorGcCount: 26,
      majorGcTime: "8.8s",

      loadProcessPercent: 78,
      loadSystemPercent: 88,
      loadSystemAverage: 6.2,

      threadCount: 160,
      threadPeakCount: 220,

      clusterTimeDiff: 22,
      eventQSize: 96,

      proxyCount: 5,
      clientEndpointCount: 10,
      connectionActiveCount: 8,
      clientConnectionCount: 20,
      connectionCount: 28,
    },
  },
];
