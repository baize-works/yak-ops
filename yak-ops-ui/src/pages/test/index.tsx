import React, {useMemo, useState} from "react";

type MenuItem = {
  key: string;
  icon: string;
  label: string;
};

const items: MenuItem[] = [
  {key: "1", icon: "🏠", label: "Dashboard"},
  {key: "2", icon: "📦", label: "Batch Jobs"},
  {key: "4", icon: "🧩", label: "Connectors"},
  {key: "5", icon: "📊", label: "Monitoring"},
  {key: "6", icon: "⚙️", label: "Settings"},
];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeKey, setActiveKey] = useState("1");

  const activeItem = useMemo(
    () => items.find((item) => item.key === activeKey),
    [activeKey]
  );

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f5f7fb;
          }

          .demo-page {
            display: flex;
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(80, 120, 255, 0.08), transparent 30%),
              linear-gradient(180deg, #f8faff 0%, #f3f6fb 100%);
          }

          .demo-sider {
            position: relative;
            width: 70px;
            min-width: 70px;
            max-width: 70px;
            height: 100vh;
            padding: 14px 10px;
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(16px);
            border-right: 1px solid rgba(15, 23, 42, 0.06);
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
            overflow: hidden;
            transition:
              width 320ms cubic-bezier(0.22, 1, 0.36, 1),
              min-width 320ms cubic-bezier(0.22, 1, 0.36, 1),
              max-width 320ms cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 220ms ease,
              background 220ms ease;
          }

          .demo-sider.expanded {
            width: 250px;
            min-width: 250px;
            max-width: 250px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
            background: rgba(255, 255, 255, 0.92);
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            height: 52px;
            padding: 0 10px;
            border-radius: 16px;
            overflow: hidden;
          }

          .brand-icon {
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            color: white;
            font-size: 16px;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.22);
          }

          .brand-text-wrap {
            overflow: hidden;
            white-space: nowrap;
          }

          .brand-title,
          .brand-subtitle {
            opacity: 0;
            transform: translateX(-10px);
            transition:
              opacity 180ms ease,
              transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .demo-sider.expanded .brand-title,
          .demo-sider.expanded .brand-subtitle {
            opacity: 1;
            transform: translateX(0);
          }

          .brand-title {
            font-size: 14px;
            line-height: 20px;
            font-weight: 700;
            color: #0f172a;
          }

          .brand-subtitle {
            font-size: 12px;
            line-height: 16px;
            color: #64748b;
          }

          .menu {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .menu-item {
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            height: 46px;
            padding: 0 12px;
            border: 0;
            outline: none;
            background: transparent;
            border-radius: 14px;
            cursor: pointer;
            transition:
              background 180ms ease,
              transform 180ms ease,
              box-shadow 180ms ease;
          }

          .menu-item:hover {
            background: rgba(59, 130, 246, 0.08);
          }

          .menu-item.active {
            background: linear-gradient(
              135deg,
              rgba(59, 130, 246, 0.14),
              rgba(99, 102, 241, 0.1)
            );
            box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1);
          }

          .menu-icon {
            width: 22px;
            min-width: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }

          .menu-label-wrap {
            overflow: hidden;
            white-space: nowrap;
            flex: 1;
          }

          .menu-label {
            display: inline-block;
            color: #0f172a;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(-10px);
            transition:
              opacity 180ms ease,
              transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .demo-sider.expanded .menu-label {
            opacity: 1;
            transform: translateX(0);
          }

          .menu-badge {
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #eef2ff;
            color: #4f46e5;
            font-size: 11px;
            font-weight: 600;
            opacity: 0;
            transform: translateX(8px);
            transition:
              opacity 180ms ease,
              transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .demo-sider.expanded .menu-badge {
            opacity: 1;
            transform: translateX(0);
          }

          .bottom-tools {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .tool-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            height: 44px;
            padding: 0 12px;
            border-radius: 14px;
            background: rgba(15, 23, 42, 0.04);
            color: #0f172a;
            border: none;
            cursor: pointer;
            overflow: hidden;
            transition: background 180ms ease;
          }

          .tool-btn:hover {
            background: rgba(15, 23, 42, 0.08);
          }

          .tool-text-wrap {
            overflow: hidden;
            white-space: nowrap;
          }

          .tool-text {
            opacity: 0;
            transform: translateX(-10px);
            transition:
              opacity 180ms ease,
              transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .demo-sider.expanded .tool-text {
            opacity: 1;
            transform: translateX(0);
          }

          .content {
            flex: 1;
            padding: 24px;
          }

          .topbar {
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(15, 23, 42, 0.06);
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
          }

          .toggle-btn {
            border: none;
            background: #0f172a;
            color: #fff;
            height: 40px;
            padding: 0 16px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          }

          .hero {
            margin-top: 20px;
            padding: 28px;
            border-radius: 28px;
            background: linear-gradient(135deg, #ffffff, #f8fbff);
            border: 1px solid rgba(15, 23, 42, 0.06);
            box-shadow: 0 14px 40px rgba(15, 23, 42, 0.05);
          }

          .hero-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.2;
            color: #0f172a;
          }

          .hero-desc {
            margin-top: 10px;
            color: #475569;
            font-size: 14px;
            line-height: 1.8;
            max-width: 760px;
          }

          .card-grid {
            margin-top: 18px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .card {
            min-height: 120px;
            padding: 18px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .card-title {
            font-size: 13px;
            color: #64748b;
          }

          .card-value {
            margin-top: 10px;
            font-size: 26px;
            font-weight: 700;
            color: #0f172a;
          }
        `}
      </style>

      <div className="demo-page">
        <aside
          className={`demo-sider ${collapsed ? "" : "expanded"}`}
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
        >
          <div className="brand">
            <div className="brand-icon">S</div>
            <div className="brand-text-wrap">
              <div className="brand-title">Yak Ops</div>
              <div className="brand-subtitle">Smooth Sider Demo</div>
            </div>
          </div>

          <div className="menu">
            {items.map((item, index) => (
              <button
                key={item.key}
                className={`menu-item ${activeKey === item.key ? "active" : ""}`}
                onClick={() => setActiveKey(item.key)}
              >
                <span className="menu-icon">{item.icon}</span>

                <span className="menu-label-wrap">
                  <span className="menu-label">{item.label}</span>
                </span>

                <span className="menu-badge">{index + 1}</span>
              </button>
            ))}
          </div>

          <div className="bottom-tools">
            <button className="tool-btn">
              <span className="menu-icon">🔍</span>
              <span className="tool-text-wrap">
                <span className="tool-text">Global Search</span>
              </span>
            </button>

            <button className="tool-btn">
              <span className="menu-icon">👤</span>
              <span className="tool-text-wrap">
                <span className="tool-text">Profile Center</span>
              </span>
            </button>
          </div>
        </aside>

        <main className="content">
          <div className="topbar">
            <div>
              <div style={{fontSize: 14, color: "#64748b"}}>Current Page</div>
              <div style={{fontSize: 18, fontWeight: 700, color: "#0f172a"}}>
                {activeItem?.label}
              </div>
            </div>

            <button
              className="toggle-btn"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          </div>

          <section className="hero">
            <h1 className="hero-title">70px → 250px 的丝滑侧边栏验证</h1>
            <div className="hero-desc">
              这个 demo 的关键不是只给 sider 做 width 动画，而是同时给文字做
              opacity + translateX，并且配合 overflow: hidden。
              这样展开时不会有“内容突然跳出来”的感觉。
            </div>

            <div className="card-grid">
              <div className="card">
                <div className="card-title">Collapsed Width</div>
                <div className="card-value">70px</div>
              </div>
              <div className="card">
                <div className="card-title">Expanded Width</div>
                <div className="card-value">250px</div>
              </div>
              <div className="card">
                <div className="card-title">Timing</div>
                <div className="card-value">320ms</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default App;
