import dayjs, { type ConfigType, type Dayjs } from 'dayjs';

/** Backend date-time contract: local wall time without an implicit UTC conversion. */
export const BACKEND_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const parseBackendDateTime = (value: ConfigType): Dayjs => dayjs(value);

export const formatBackendDateTime = (value: ConfigType): string =>
  dayjs(value).format(BACKEND_DATE_TIME_FORMAT);

