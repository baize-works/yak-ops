import {
  DATA_QUALITY_TABLE_CLASS_NAME,
  dataQualityTableClassName,
} from './tableStyle';

describe('data-quality table style', () => {
  it('contains the shared table selectors', () => {
    expect(DATA_QUALITY_TABLE_CLASS_NAME).toContain(
      '[&_.ant-table-thead>tr>th]:!bg-[#f8f9fb]',
    );
    expect(DATA_QUALITY_TABLE_CLASS_NAME).toContain(
      '[&_.ant-table-tbody>tr:hover>td]:!bg-[#fafbfc]',
    );
    expect(DATA_QUALITY_TABLE_CLASS_NAME).toContain(
      '[&_.ant-table-cell-fix-right]:!bg-white',
    );
  });

  it('merges page-specific class names', () => {
    expect(dataQualityTableClassName('mt-3')).toContain('mt-3');
  });
});
