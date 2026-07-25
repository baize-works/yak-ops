import {Tooltip} from 'antd';
import DevIcon from './env/DevIcon';
import ProIcon from './env/ProIcon';
import TestIcon from './env/TestIcon';

interface EnvIconsProps {
  env: number;
}

const EnvIcons = ({env}: EnvIconsProps) => {
  if (env === 1) {
    return (
      <Tooltip title="开发环境">
        <span>
          <DevIcon/>
        </span>
      </Tooltip>
    );
  } else if (env === 2) {
    return (
      <Tooltip title="测试环境">
        <span>
          <TestIcon/>
        </span>
      </Tooltip>
    );
  } else {
    return (
      <Tooltip title="生产环境">
        <span>
          <ProIcon/>
        </span>
      </Tooltip>
    );
  }
};

export default EnvIcons;
