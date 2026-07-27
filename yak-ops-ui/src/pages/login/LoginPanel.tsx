import { login } from "@/services/security/account";
import { resetAuthenticationFailure } from "@/utils/request";
import { getSafeReturnTo } from "@/utils/security/redirect";
import { ArrowRightOutlined } from "@ant-design/icons";
import { history, useIntl, useModel } from "@umijs/max";
import { App, Button, Form, Input } from "antd";
import { useForm } from "antd/es/form/Form";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import GoogleLoginButton from "./components/GoogleLoginButton";
import "./index.less";

type ActionType =
  | "BLINK"
  | "SMILE"
  | "SURPRISE"
  | "TILT"
  | "SHAKE"
  | "BOW"
  | "THANKS";

type FocusedField = "userName" | "userPassword" | null;

type LoginPanelProps = {
  onFire: (type: ActionType) => void;
  onPanelHoverChange?: (hovered: boolean) => void;
  onFieldFocusChange?: (field: FocusedField) => void;
};

export default function LoginPanel({
  onFire,
  onPanelHoverChange,
  onFieldFocusChange,
}: LoginPanelProps) {
  const [loading, setLoading] = useState(false);
  const [form] = useForm();
  const lastFireRef = useRef<Record<string, number>>({});

  const { initialState, setInitialState } = useModel("@@initialState");
  const { message } = App.useApp();
  const intl = useIntl();

  const fireThrottled = (key: string, type: ActionType, gapMs = 900) => {
    const now = Date.now();
    const last = lastFireRef.current[key] || 0;

    if (now - last >= gapMs) {
      lastFireRef.current[key] = now;
      onFire(type);
    }
  };

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();

    if (userInfo) {
      flushSync(() => {
        setInitialState((s: any) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
    return userInfo;
  };

  const redirectAfterLogin = () => {
    const requested = new URLSearchParams(window.location.search).get(
      "returnTo"
    );
    history.replace(getSafeReturnTo(requested));
  };

  const handleAccountLogin = async (values: {
    userName: string;
    userPassword: string;
  }) => {
    try {
      await form.validateFields();
      setLoading(true);

      await login({
        userName: values.userName,
        pw: values.userPassword,
      });
      resetAuthenticationFailure();
      message.success(
        intl.formatMessage({
          id: "pages.login.success",
          defaultMessage: "登录成功！",
        })
      );

      onFieldFocusChange?.(null);
      onFire("THANKS");

      const userInfo = await fetchUserInfo();
      if (!userInfo) throw new Error("登录后无法加载当前用户");
      redirectAfterLogin();
    } catch (_error) {
      onFire("SHAKE");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async () => {
    onFieldFocusChange?.(null);
    onFire("THANKS");

    const userInfo = await fetchUserInfo();
    if (!userInfo) return;
    redirectAfterLogin();
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px",
      }}
      onMouseEnter={() => onPanelHoverChange?.(true)}
      onMouseLeave={() => {
        onPanelHoverChange?.(false);
        onFieldFocusChange?.(null);
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Welcome back!
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 14,
              color: "#647b9a",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Please enter your details
          </p>
        </div>

        <Form
          layout="vertical"
          form={form}
          requiredMark={false}
          onFinish={handleAccountLogin}
        >
          <Form.Item
            label={
              <span
                style={{
                  fontWeight: 500,
                  color: "black",
                  fontSize: "0.875rem",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                用户名
              </span>
            }
            name="userName"
            style={{ marginBottom: 18 }}
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input
              className="login-input"
              size="large"
              placeholder="请输入用户名"
              autoComplete="username"
              onFocus={() => {
                onFieldFocusChange?.("userName");
                fireThrottled("focus_user", "SURPRISE", 1200);
              }}
              onBlur={() => {
                onFieldFocusChange?.(null);
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <span
                style={{
                  fontWeight: 500,
                  color: "black",
                  fontSize: "0.875rem",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Password
              </span>
            }
            name="userPassword"
            style={{ marginBottom: 14 }}
            rules={[
              {
                required: true,
                message: "Please enter your password",
              },
            ]}
          >
            <Input.Password
              className="login-password-input"
              size="large"
              placeholder="••••••••"
              autoComplete="current-password"
              onFocus={() => {
                onFieldFocusChange?.("userPassword");
                fireThrottled("focus_pwd", "BLINK", 1200);
              }}
              onBlur={() => {
                onFieldFocusChange?.(null);
              }}
            />
          </Form.Item>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            <Button type="link" style={{ padding: 0 }}>
              Forgot password?
            </Button>
          </div>

          <Button
            className="animated-profile-btn-v2"
            block
            type="default"
            htmlType="submit"
            loading={loading}
            onMouseEnter={() => fireThrottled("login_hover", "SMILE", 900)}
          >
            <span className="default-layer">Log in</span>

            <span className="hover-layer">
              <span className="hover-label">Log in</span>
              <span className="hover-icon">
                <ArrowRightOutlined />
              </span>
            </span>
          </Button>

          <GoogleLoginButton
            className="animated-profile-btn-v2"
            style={{ marginTop: 14 }}
            loading={loading}
            onStart={() => {
              onFieldFocusChange?.(null);
              setLoading(true);
            }}
            onSuccess={handleGoogleSuccess}
            onError={() => {
              onFieldFocusChange?.(null);
              onFire("SHAKE");
              setLoading(false);
            }}
          />

          <div
            style={{
              marginTop: 26,
              textAlign: "center",
              color: "rgba(71, 85, 105, 0.72)",
              fontSize: 14,
            }}
          >
            Don&apos;t have an account?{" "}
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 600 }}
              onMouseEnter={() => fireThrottled("signup_hover", "TILT", 900)}
            >
              Sign Up
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
