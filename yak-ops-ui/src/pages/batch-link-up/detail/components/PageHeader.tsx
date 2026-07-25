import {ArrowLeftOutlined, ProductOutlined} from "@ant-design/icons";
import {Button} from "antd";

interface Props {
  onBack: () => void;
}

const PageHeader: React.FC<Props> = ({onBack}) => {
  return (
    <div className="border-b border-[#F2F4F7] bg-white">
      <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4 px-6 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[20px] text-[#1570EF]">
            <ProductOutlined/>
          </div>

          <div className="min-w-0">
            <div className="text-[22px] font-semibold leading-8 text-[#101828]">
              创建离线同步任务
            </div>
            <div className="mt-1 text-[14px] leading-6 text-[#667085]">
              先补充基础信息，再选择合适的配置方式，几步就能开始创建任务。
            </div>
          </div>
        </div>

        <Button
          type="text"
          icon={<ArrowLeftOutlined/>}
          onClick={onBack}
          className="!h-10 !rounded-full !border !border-[#E4E7EC] !bg-white !px-4 !text-[#344054] shadow-sm"
        >
          返回上一页
        </Button>
      </div>
    </div>
  );
};

export default PageHeader;
