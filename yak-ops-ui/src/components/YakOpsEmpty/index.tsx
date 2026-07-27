import React, { useId } from 'react';

export interface YakOpsEmptyProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** 插画宽度 */
  width?: number | string;
  /** 插画高度 */
  height?: number | string;
  /** 品牌主色 */
  primaryColor?: string;
  /** 无障碍标题 */
  title?: string;
  /** 无障碍描述 */
  description?: string;
}

const YakOpsEmpty: React.FC<YakOpsEmptyProps> = ({
  width = 240,
  height = 190,
  primaryColor = '#ff527e',
  title = 'Yak Ops 暂无数据',
  description = '一只小牦牛拿着扳手，正在检查空的服务器机柜',
  style,
  ...props
}) => {
  const titleId = useId();
  const descriptionId = useId();

  const lineColor = '#515151';
  const mutedColor = '#c6cacd';
  const panelColor = '#e8eaec';
  const primarySoftColor = '#fff0f4';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      focusable="false"
      style={style}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>

      <rect width="240" height="190" fill="transparent" />

      {/* 背景装饰 */}
      <circle cx="20" cy="101" r="3" fill={primarySoftColor} />
      <circle cx="220" cy="74" r="3" fill={mutedColor} />
      <circle cx="208" cy="31" r="2" fill={primaryColor} opacity="0.45" />

      {/* 疑问气泡 */}
      <circle cx="194" cy="45" r="27" fill={primarySoftColor} />
      <path
        d="M190.5 44.5C190.5 40.9 192.8 38.5 196.3 38.5C199.7 38.5 202 40.6 202 43.4C202 45.8 200.7 47.1 198.5 48.5C196.4 49.8 195.5 51 195.5 53"
        stroke={primaryColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="195.5" cy="59" r="2.5" fill={primaryColor} />

      {/* 地面阴影 */}
      <ellipse cx="124" cy="174" rx="91" ry="7" fill="#000" opacity="0.055" />

      {/* 左牛角 */}
      <path
        d="M65 54C54 54 48 47 49 38C53 44 58 46 66 45"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 右牛角 */}
      <path
        d="M91 54C102 54 108 47 107 38C103 44 98 46 90 45"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 耳朵 */}
      <path
        d="M64 58C57 54 52 57 54 62C56 66 61 66 66 64"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M92 58C99 54 104 57 102 62C100 66 95 66 90 64"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 头部 */}
      <path
        d="M61 56C64 49 70 46 78 46C86 46 92 49 95 56L92 79C91 88 86 93 78 93C70 93 65 88 64 79L61 56Z"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 额头毛发 */}
      <path
        d="M68 50L72 56L77 49L81 56L87 50"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 眼睛 */}
      <circle cx="71" cy="66" r="2" fill={lineColor} />
      <circle cx="85" cy="66" r="2" fill={lineColor} />

      {/* 鼻口 */}
      <ellipse
        cx="78"
        cy="78"
        rx="11"
        ry="8"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="2"
      />
      <circle cx="74" cy="77" r="1.3" fill={lineColor} />
      <circle cx="82" cy="77" r="1.3" fill={lineColor} />
      <path
        d="M75 82C77 84 79 84 81 82"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* 身体 */}
      <path
        d="M61 93C66 88 71 87 78 87C88 87 95 91 100 99L107 124C109 134 103 142 93 143H64C53 142 48 134 50 124L55 101C56 97 58 95 61 93Z"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 胸前标志 */}
      <path
        d="M70 104L78 99L86 104V114L78 119L70 114V104Z"
        fill={primarySoftColor}
        stroke={primaryColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M74 108L78 111L83 106"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 左手 */}
      <path
        d="M57 101C49 106 45 114 45 123C45 128 48 131 52 130C56 129 58 124 59 118"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 右手 */}
      <path
        d="M98 102C106 105 112 111 117 118C120 122 124 123 127 120C130 117 128 113 125 110C119 103 111 98 101 95"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 扳手 */}
      <path
        d="M117 112L133 126"
        stroke={lineColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M112 107C109 103 110 98 114 95L116 101L121 102L124 97C126 102 124 107 120 109"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="135"
        cy="128"
        r="4"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
      />

      {/* 腿 */}
      <path
        d="M64 142L62 161C62 165 65 168 69 168H75L76 143"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M88 143L89 161C89 165 92 168 96 168H102L98 141"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 脚 */}
      <path d="M61 163H76V170H58C58 167 59 165 61 163Z" fill={lineColor} />
      <path
        d="M89 163H101C105 164 107 166 107 170H90L89 163Z"
        fill={lineColor}
      />

      {/* 机柜顶部 */}
      <path
        d="M134 93L143 84H202L210 93H134Z"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 机柜主体 */}
      <rect
        x="134"
        y="93"
        width="76"
        height="68"
        rx="4"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="2"
      />
      <rect
        x="143"
        y="84"
        width="59"
        height="9"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="2"
      />

      {/* 第一层服务器 */}
      <rect
        x="142"
        y="101"
        width="60"
        height="17"
        rx="2"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="1.6"
      />
      <circle cx="149" cy="109.5" r="2" fill={primaryColor} />
      <circle cx="156" cy="109.5" r="2" fill={mutedColor} />
      <path
        d="M181 109H195"
        stroke={lineColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* 空抽屉 */}
      <path
        d="M141 128H202V145H141V128Z"
        fill="#fff"
        stroke={lineColor}
        strokeWidth="1.8"
      />
      <path
        d="M141 145L148 154H195L202 145H141Z"
        fill={panelColor}
        stroke={lineColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M154 136H189"
        stroke={mutedColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />

      {/* 终端符号 */}
      <path
        d="M150 108L153 110.5L150 113"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 机柜脚 */}
      <path
        d="M142 161V168"
        stroke={lineColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M202 161V168"
        stroke={lineColor}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* 状态装饰 */}
      <path
        d="M116 74C121 69 127 67 133 68"
        stroke={mutedColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
      <path
        d="M119 81C125 78 130 78 136 80"
        stroke={mutedColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
    </svg>
  );
};

export default YakOpsEmpty;