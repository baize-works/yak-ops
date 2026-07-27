import {GoogleOutlined} from "@ant-design/icons";
import {App, Button} from "antd";
import React, {useEffect, useRef, useState} from "react";
import {googleLogin} from "../type";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onStart?: () => void;
  onSuccess?: (data: any) => Promise<void> | void;
  onError?: (error: any) => void;
}

const GOOGLE_GSI_SCRIPT_ID = "google-gsi-script";
const GOOGLE_CLIENT_ID = process.env.UMI_APP_GOOGLE_CLIENT_ID || "";

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services script"));
    document.body.appendChild(script);
  });
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
                                                               loading = false,
                                                               disabled = false,
                                                               className,
                                                               style,
                                                               onStart,
                                                               onSuccess,
                                                               onError,
                                                             }) => {
  const {message} = App.useApp();
  const [ready, setReady] = useState(false);
  const [innerLoading, setInnerLoading] = useState(false);
  const initedRef = useRef(false);
  const warnedRef = useRef(false);

  const onStartRef = useRef(onStart);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStartRef.current = onStart;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onStart, onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.log(process.env)
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.warn("Missing UMI_APP_GOOGLE_CLIENT_ID");
      }
      return;
    }

    const initGoogle = async () => {
      try {
        await loadGoogleScript();

        if (!window.google || initedRef.current) {
          setReady(!!window.google);
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              message.error("Google credential is empty");
              return;
            }

            try {
              setInnerLoading(true);
              onStartRef.current?.();

              await googleLogin(response.credential);
              await onSuccessRef.current?.();
            } catch (error) {
              console.error(error);
              onErrorRef.current?.(error);
            } finally {
              setInnerLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        initedRef.current = true;
        setReady(true);
      } catch (error) {
        console.error(error);
        setReady(false);
      }
    };

    initGoogle();
  }, [message]);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      message.error("Google Client ID is not configured");
      return;
    }

    if (!window.google || !ready) {
      message.error("Google login is not ready yet");
      return;
    }

    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error(error);
      message.error("Unable to open Google login");
      onErrorRef.current?.(error);
    }
  };

  return (
    <Button
      className={className}
      style={style}
      block
      type="default"
      icon={<GoogleOutlined/>}
      loading={loading || innerLoading}
      disabled={disabled || !ready}
      onClick={handleClick}
    >
      Log in with Google
    </Button>
  );
};

export default GoogleLoginButton;
