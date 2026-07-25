import {
  Activity,
  Bell,
  BookOpen,
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coins,
  ExternalLink,
  FileText,
  Flame,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  ListTodo,
  Mail,
  Maximize2,
  MessageCircle,
  Music2,
  Plus,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
  Video,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import './index.less';

type CreationTone = 'video' | 'image' | 'panorama' | 'article';

interface CreationAction {
  title: string;
  description: string;
  tone: CreationTone;
  icon: LucideIcon;
}

interface ActivityItem {
  title: string;
  category: string;
  time: string;
}

interface TrendItem {
  rank: number;
  title: string;
  valueLabel: string;
  value: string;
  image: string;
}

interface TrendColumn {
  key: string;
  title: string;
  secondaryTitle: string;
  icon: LucideIcon;
  items: TrendItem[];
}

const creationActions: CreationAction[] = [
  {
    title: '发布视频',
    description: '支持常用格式，推荐 mp4、webm',
    tone: 'video',
    icon: Video,
  },
  {
    title: '发布图文',
    description: '支持常用图片格式，png、jpg',
    tone: 'image',
    icon: ImageIcon,
  },
  {
    title: '发布全景视频',
    description: '推荐分辨率为 4K（3840×1920）及以上',
    tone: 'panorama',
    icon: Maximize2,
  },
  {
    title: '发布文章',
    description: '支持上传 8000 字文本和 30 个图片素材',
    tone: 'article',
    icon: FileText,
  },
];

const activityItems: ActivityItem[] = [
  {
    title: '音为有你全民开唱挑战赛',
    category: '音乐',
    time: '07-09~08-06',
  },
  {
    title: '千万流量！人文经典 AI 作品等你投稿',
    category: '人文社科',
    time: '07-08~08-15',
  },
  {
    title: '创作优质作品分 10 万',
    category: '综合',
    time: '07-06~09-30',
  },
];

const calendarWeeks = [
  ['', '', '', '01', '02', '03', '04'],
  ['05', '06', '07', '08', '09', '10', '11'],
  ['12', '13', '14', '15', '16', '17', '18'],
  ['19', '20', '21', '22', '23', '24', '25'],
  ['26', '27', '28', '29', '30', '31', ''],
];

const trendColumns: TrendColumn[] = [
  {
    key: 'recommend',
    title: '猜你喜欢',
    secondaryTitle: '热门话题',
    icon: Heart,
    items: [
      {
        rank: 1,
        title: '简约风穿搭真是 YYDS',
        valueLabel: '热度',
        value: '261.2 万',
        image: 'https://picsum.photos/seed/yak-fashion-1/120/90',
      },
      {
        rank: 2,
        title: '三室两厅两卫房子介绍',
        valueLabel: '热度',
        value: '100.8 万',
        image: 'https://picsum.photos/seed/yak-home-2/120/90',
      },
      {
        rank: 3,
        title: '拎包入住型公寓推荐',
        valueLabel: '热度',
        value: '206 万',
        image: 'https://picsum.photos/seed/yak-house-3/120/90',
      },
      {
        rank: 4,
        title: '全屋定制家装推荐',
        valueLabel: '热度',
        value: '82.6 万',
        image: 'https://picsum.photos/seed/yak-room-4/120/90',
      },
    ],
  },
  {
    key: 'video',
    title: '热门视频',
    secondaryTitle: '热点榜单',
    icon: Flame,
    items: [
      {
        rank: 1,
        title: '饭店的暑假工，外卖改变食堂！',
        valueLabel: '热度',
        value: '70.72 万',
        image: 'https://picsum.photos/seed/yak-video-1/120/90',
      },
      {
        rank: 2,
        title: '一摸一个不吱声！夏日轻松挑战',
        valueLabel: '热度',
        value: '55.35 万',
        image: 'https://picsum.photos/seed/yak-video-2/120/90',
      },
      {
        rank: 3,
        title: '这挑战油边干完都亮红灯走的',
        valueLabel: '热度',
        value: '44.41 万',
        image: 'https://picsum.photos/seed/yak-video-3/120/90',
      },
      {
        rank: 4,
        title: '00 后男生跟父母说今年带女朋友回家',
        valueLabel: '热度',
        value: '39.10 万',
        image: 'https://picsum.photos/seed/yak-video-4/120/90',
      },
    ],
  },
  {
    key: 'course',
    title: '热门课程',
    secondaryTitle: '精选专题',
    icon: BookOpen,
    items: [
      {
        rank: 1,
        title: '优质内容创作完整指南',
        valueLabel: '播放量',
        value: '197.13 万',
        image: 'https://picsum.photos/seed/yak-course-1/120/90',
      },
      {
        rank: 2,
        title: '封面创作技巧大揭秘',
        valueLabel: '播放量',
        value: '83.83 万',
        image: 'https://picsum.photos/seed/yak-course-2/120/90',
      },
      {
        rank: 3,
        title: '从 0 到 1 把课程做爆',
        valueLabel: '播放量',
        value: '80.68 万',
        image: 'https://picsum.photos/seed/yak-course-3/120/90',
      },
      {
        rank: 4,
        title: '重要内容指标详细讲解',
        valueLabel: '播放量',
        value: '75.22 万',
        image: 'https://picsum.photos/seed/yak-course-4/120/90',
      },
    ],
  },
];

const dataTabs = ['数据总览', '近期作品', '直播数据'];
const creationTabs = ['猜你喜欢', '热门话题', '热门挑战'];

function SectionHeader({
  title,
  extra,
}: {
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="home-section-header">
      <h2>{title}</h2>
      {extra}
    </div>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'home-empty home-empty--compact' : 'home-empty'}>
      <div className="home-empty__illustration">
        <span className="home-empty__question">?</span>
        <span className="home-empty__box" />
        <span className="home-empty__line home-empty__line--one" />
        <span className="home-empty__line home-empty__line--two" />
      </div>
      <div className="home-empty__title">{title}</div>
      {description && (
        <div className="home-empty__description">{description}</div>
      )}
    </div>
  );
}

function TrendList({ column }: { column: TrendColumn }) {
  const [activeTab, setActiveTab] = useState(column.title);
  const ColumnIcon = column.icon;

  return (
    <div className="trend-column">
      <div className="trend-column__tabs">
        <button
          type="button"
          className={activeTab === column.title ? 'is-active' : ''}
          onClick={() => setActiveTab(column.title)}
        >
          <ColumnIcon size={15} strokeWidth={2} />
          {column.title}
        </button>
        <button
          type="button"
          className={activeTab === column.secondaryTitle ? 'is-active' : ''}
          onClick={() => setActiveTab(column.secondaryTitle)}
        >
          {column.secondaryTitle}
        </button>
      </div>

      <div className="trend-column__list">
        {column.items.map((item) => (
          <article className="trend-item" key={`${column.key}-${item.rank}`}>
            <div
              className="trend-item__cover"
              style={{ backgroundImage: `url(${item.image})` }}
            >
              <span className={`trend-item__rank rank-${item.rank}`}>
                {item.rank}
              </span>
            </div>

            <div className="trend-item__content">
              <div className="trend-item__title">{item.title}</div>
              <div className="trend-item__meta">
                {item.valueLabel}
                <strong>{item.value}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const HomePage = () => {
  const [dataTab, setDataTab] = useState(dataTabs[0]);
  const [creationTab, setCreationTab] = useState(creationTabs[0]);
  const [month, setMonth] = useState(7);

  const monthText = useMemo(
    () => `2026年${String(month).padStart(2, '0')}月`,
    [month],
  );

  const changeMonth = (offset: number) => {
    setMonth((current) => {
      const next = current + offset;
      if (next < 1) {
        return 12;
      }
      if (next > 12) {
        return 1;
      }
      return next;
    });
  };

  return (
    <div className="home-page">
      <section className="home-profile">
        <div className="home-profile__glow home-profile__glow--one" />
        <div className="home-profile__glow home-profile__glow--two" />

        <img
          className="home-profile__avatar"
          src="https://picsum.photos/seed/yak-ops-user/120/120"
          alt="用户头像"
        />

        <div className="home-profile__content">
          <div className="home-profile__identity">
            <strong>正函数</strong>
            <span className="home-profile__divider" />
            <span>账号：83644455250</span>
            <span className="home-profile__divider" />
            <span>见路不走</span>
          </div>

          <div className="home-profile__statistics">
            <span>
              关注<strong>149</strong>
            </span>
            <span>
              粉丝<strong>29</strong>
            </span>
            <span>
              获赞<strong>0</strong>
            </span>
          </div>
        </div>

        <div className="home-profile__actions">
          <button type="button">
            <Bell size={17} />
            <span>通知</span>
          </button>
          <button type="button">
            <Grid2X2 size={17} />
            <span>应用</span>
          </button>
        </div>
      </section>

      <section className="home-card home-creation">
        <SectionHeader
          title="新的创作"
          extra={
            <div className="home-section-link">
              你有一个上次未发布的作品
              <button type="button">
                继续编辑
                <ChevronRight size={14} />
              </button>
            </div>
          }
        />

        <div className="home-creation__grid">
          {creationActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                type="button"
                className={`creation-action creation-action--${action.tone}`}
                key={action.title}
              >
                <span className="creation-action__icon">
                  <Icon size={23} strokeWidth={2.2} />
                </span>
                <span className="creation-action__content">
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </span>
                <span className="creation-action__decoration" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="home-dashboard-grid">
        <section className="home-card home-data-center">
          <SectionHeader
            title="数据中心"
            extra={
              <div className="home-section-link">
                <span className="home-muted">
                  统计周期：2026.07.18-2026.07.24（每天12点更新）
                </span>
                <button type="button">
                  查看更多
                  <ChevronRight size={14} />
                </button>
              </div>
            }
          />

          <div className="home-data-center__body">
            <aside className="latest-work">
              <h3>最新作品</h3>
              <EmptyState
                compact
                title="近30天未发布新作品"
                description="快去发布作品吧"
              />
            </aside>

            <div className="data-overview">
              <div className="data-overview__toolbar">
                <div className="home-tabs">
                  {dataTabs.map((tab) => (
                    <button
                      type="button"
                      className={dataTab === tab ? 'is-active' : ''}
                      onClick={() => setDataTab(tab)}
                      key={tab}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button type="button" className="home-filter-button">
                  时间
                  <strong>近7日</strong>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="data-overview__content">
                <EmptyState title={dataTab === '数据总览' ? '暂无数据' : `暂无${dataTab}`} />
              </div>
            </div>
          </div>
        </section>

        <aside className="home-card home-activity-center">
          <SectionHeader
            title="活动中心"
            extra={
              <button type="button" className="home-more-button">
                查看更多
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="activity-status">
            <span />
            进行中
          </div>

          <div className="calendar-header">
            <button type="button" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={15} />
            </button>
            <strong>{monthText}</strong>
            <button type="button" onClick={() => changeMonth(1)}>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarWeeks.flatMap((week, weekIndex) =>
              week.map((day, dayIndex) => (
                <div
                  className={[
                    'calendar-cell',
                    day && Number(day) >= 1 ? 'has-event' : '',
                    day === '25' ? 'is-current' : '',
                  ].join(' ')}
                  key={`${weekIndex}-${dayIndex}`}
                >
                  {day}
                </div>
              )),
            )}
          </div>

          <div className="activity-summary">
            <div className="activity-summary__header">
              <strong>{month}月活动总览</strong>
              <span>共84个进行中</span>
            </div>

            <div className="activity-summary__list">
              {activityItems.map((item) => (
                <article key={item.title}>
                  <span className="activity-summary__dot" />
                  <div className="activity-summary__title">{item.title}</div>
                  <span className="activity-summary__tag">{item.category}</span>
                  <time>{item.time}</time>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className="home-card interaction-card">
          <SectionHeader title="互动管理" />

          <div className="interaction-card__body">
            <div className="interaction-item">
              <div className="interaction-item__title">
                <MessageCircle size={15} />
                <strong>作品评论</strong>
              </div>
              <p>暂无新的评论，去看看历史评论吧</p>
              <button type="button">
                评论管理
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="interaction-item">
              <div className="interaction-item__title">
                <Mail size={15} />
                <strong>私信消息</strong>
                <span className="interaction-badge">+1</span>
                <time>07-25 21:47</time>
              </div>
              <p className="interaction-item__message">
                你收到一条新类型消息，请打开客户端查看
              </p>
              <div className="interaction-item__sender">
                <span className="interaction-item__sender-avatar" />
                测试代打群
              </div>
              <button type="button">
                私信管理
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="home-lower-grid">
        <section className="home-card monetization-card">
          <SectionHeader
            title="变现中心"
            extra={
              <button type="button" className="home-more-button">
                查看更多
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="monetization-card__body">
            <div className="income-overview">
              <div>
                <strong>近7日</strong>
                <span>07-18~07-24</span>
                <ChevronRight size={13} />
              </div>
              <div className="income-overview__amount">¥ ******</div>
            </div>

            <button type="button" className="task-card">
              <span className="task-card__icon">
                <Coins size={17} />
              </span>
              <span className="task-card__content">
                <strong>可参与任务 0 个</strong>
                <span>暂无，先去提升粉丝量吧</span>
              </span>
              <span className="task-card__action">去查看</span>
            </button>

            <button type="button" className="task-card">
              <span className="task-card__icon">
                <ListTodo size={17} />
              </span>
              <span className="task-card__content">
                <strong>我的任务 0 个</strong>
                <span>暂无，先去提升粉丝量吧</span>
              </span>
              <span className="task-card__action">去查看</span>
            </button>
          </div>
        </section>

        <aside className="home-card quick-navigation">
          <SectionHeader
            title="快捷导航"
            extra={
              <button type="button" className="home-more-button">
                查看更多
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="quick-navigation__grid">
            {[
              { label: '内容官网', icon: Music2 },
              { label: '星图平台', icon: Sparkles },
              { label: '企业号', icon: Box },
              { label: '直播开放平台', icon: Radio },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button type="button" key={item.label}>
                  <span>
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="home-card creation-center">
          <SectionHeader title="创作中心" />

          <div className="creation-center__tabs">
            {creationTabs.map((tab) => (
              <button
                type="button"
                className={creationTab === tab ? 'is-active' : ''}
                onClick={() => setCreationTab(tab)}
                key={tab}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="creation-center__columns">
            {trendColumns.map((column) => (
              <TrendList column={column} key={column.key} />
            ))}
          </div>
        </section>

        <aside className="home-card focus-card">
          <SectionHeader
            title="重点关心"
            extra={
              <button type="button" className="home-more-button">
                查看更多
                <ChevronRight size={14} />
              </button>
            }
          />

          <div className="focus-card__empty">
            <div className="focus-card__illustration">
              <Star size={48} strokeWidth={1.4} />
              <Plus size={22} strokeWidth={2.3} />
            </div>
            <p>你可以添加10个3000粉丝以上重点关心的账号</p>
            <button type="button">
              <Plus size={15} />
              添加关心
            </button>
          </div>
        </aside>
      </div>

      <button type="button" className="home-help-button" aria-label="帮助">
        <CircleHelp size={21} />
      </button>

      <div className="home-footer-hint">
        <Activity size={14} />
        页面为静态演示数据，可按实际接口替换
        <ExternalLink size={13} />
      </div>
    </div>
  );
};

export default HomePage;