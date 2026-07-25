import CommonClientLinkSection, {ConnectivityStatus,} from "@/pages/common/components/CommonClientLinkSection";

interface Props {
  activeStep: "base" | "client";
  sourceType: any;
  targetType: any;
  sourceLabel: string;
  targetLabel: string;
  clientId: any;
  setClientId: (ids: string) => void;
  handleSourceChange: (value: string, option: any) => void;
  handleTargetChange: (value: string, option: any) => void;

  sourceDataSourceId?: string;
  targetDataSourceId?: string;
  setSourceDataSourceId: (id?: string) => void;
  setTargetDataSourceId: (id?: string) => void;

  sourceTestStatus: ConnectivityStatus;
  targetTestStatus: ConnectivityStatus;
  setSourceTestStatus: (status: ConnectivityStatus) => void;
  setTargetTestStatus: (status: ConnectivityStatus) => void;

  sectionRef?: React.RefObject<HTMLDivElement>;
}

const ClientLinkSection: React.FC<Props> = (props) => {
  return (
    <CommonClientLinkSection
      {...props}
      scene="offline"
      clientLabel="我的客户端"
      clientPlaceholder="请选择 Zeta 客户端节点"
      sourceTitle="来源"
      targetTitle="去向"
      sourceCreateText="新建来源数据源"
      targetCreateText="新建去向数据源"
    />
  );
};

export default ClientLinkSection;
