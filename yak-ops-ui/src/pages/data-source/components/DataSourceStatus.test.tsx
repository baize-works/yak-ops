import { render, screen } from '@testing-library/react';

import DataSourceStatus from './DataSourceStatus';

describe('DataSourceStatus', () => {
  it.each([
    ['CONNECTED', '已连接'],
    ['DISCONNECTED', '连接失败'],
    ['UNKNOWN', '待检测'],
  ])('renders backend status %s', (status, expectedText) => {
    const { unmount } = render(<DataSourceStatus status={status} />);

    expect(screen.getByText(expectedText)).toBeInTheDocument();
    unmount();
  });

  it('keeps legacy connected status compatible', () => {
    render(<DataSourceStatus status="CONNECTED_SUCCESS" />);

    expect(screen.getByText('已连接')).toBeInTheDocument();
  });
});
