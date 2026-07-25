import ClickSpark from '@/components/ClickSpark';
import { useIntl } from '@umijs/max';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import AlarmPageHeader from './components/AlarmPageHeader';
import ChannelTab from './components/ChannelTab';
import RecordTab from './components/RecordTab';
import RuleTab from './components/RuleTab';
import ScrollableFilter, {
  type FilterOption,
} from './components/ScrollableFilter';
import { PAGE_ANIMATION } from './constants';

type AlarmViewKey = 'channels' | 'rules' | 'records';

const AlarmPage: React.FC = () => {
  const intl = useIntl();

  const [activeKey, setActiveKey] =
    useState<AlarmViewKey>('channels');

  /**
   * 首次访问时才挂载对应模块。
   * 挂载后保持状态，避免切换回来重新请求接口。
   */
  const [visited, setVisited] = useState<
    Record<AlarmViewKey, boolean>
  >({
    channels: true,
    rules: false,
    records: false,
  });

  const navigationOptions = useMemo<
    FilterOption<AlarmViewKey>[]
  >(
    () => [
      {
        label: intl.formatMessage({
          id: 'pages.alarm.tab.channels',
          defaultMessage: '告警通道',
        }),
        value: 'channels',
      },
      {
        label: intl.formatMessage({
          id: 'pages.alarm.tab.rules',
          defaultMessage: '告警规则',
        }),
        value: 'rules',
      },
      {
        label: intl.formatMessage({
          id: 'pages.alarm.tab.records',
          defaultMessage: '告警记录',
        }),
        value: 'records',
      },
    ],
    [intl],
  );

  const handleViewChange = (key: AlarmViewKey) => {
    setActiveKey(key);

    setVisited((prev) => {
      if (prev[key]) {
        return prev;
      }

      return {
        ...prev,
        [key]: true,
      };
    });
  };

  return (
    <ClickSpark
      sparkColor="hsl(231 48% 48%)"
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
      easing="ease-out"
      extraScale={1}
    >
      <div className="mx-auto w-full max-w-7xl pb-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={PAGE_ANIMATION.sectionStagger}
        >
          <motion.div variants={PAGE_ANIMATION.fadeUp}>
            <AlarmPageHeader />
          </motion.div>

          <motion.div variants={PAGE_ANIMATION.fadeUp}>
            <div className="sticky top-12 z-20 bg-white/95 py-3 backdrop-blur-sm">
              <ScrollableFilter
                value={activeKey}
                options={navigationOptions}
                onChange={handleViewChange}
              />
            </div>

            <div className="mt-6 min-h-[420px]">
              {visited.channels && (
                <div
                  className={
                    activeKey === 'channels'
                      ? 'block'
                      : 'hidden'
                  }
                >
                  <ChannelTab />
                </div>
              )}

              {visited.rules && (
                <div
                  className={
                    activeKey === 'rules'
                      ? 'block'
                      : 'hidden'
                  }
                >
                  <RuleTab />
                </div>
              )}

              {visited.records && (
                <div
                  className={
                    activeKey === 'records'
                      ? 'block'
                      : 'hidden'
                  }
                >
                  <RecordTab />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </ClickSpark>
  );
};

export default AlarmPage;