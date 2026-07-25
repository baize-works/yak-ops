"use client";

import {memo, useEffect, useMemo, useRef, useState} from "react";
import {Sparkles} from "lucide-react";

type XY = { x: number; y: number };

interface PupilProps {
  size?: number;
  pupilColor?: string;
  offsetX?: number;
  offsetY?: number;
}

const Pupil = memo(function Pupil({
                                    size = 12,
                                    pupilColor = "black",
                                    offsetX = 0,
                                    offsetY = 0,
                                  }: PupilProps) {
  return (
    <div
      className="rounded-full will-change-transform"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
      }}
    />
  );
});

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  offsetX?: number;
  offsetY?: number;
}

const EyeBall = memo(function EyeBall({
                                        size = 48,
                                        pupilSize = 16,
                                        eyeColor = "white",
                                        pupilColor = "black",
                                        isBlinking = false,
                                        offsetX = 0,
                                        offsetY = 0,
                                      }: EyeBallProps) {
  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden transition-[height] duration-150 will-change-transform"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full will-change-transform"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
          }}
        />
      )}
    </div>
  );
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getLookOffset(
  from: XY,
  to: XY,
  maxDistance: number,
  forceLookX?: number,
  forceLookY?: number
) {
  if (forceLookX !== undefined && forceLookY !== undefined) {
    return {x: forceLookX, y: forceLookY};
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.min(Math.hypot(dx, dy), maxDistance);

  if (distance === 0) return {x: 0, y: 0};

  const angle = Math.atan2(dy, dx);

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const [smoothedMouse, setSmoothedMouse] = useState<XY>({x: 0, y: 0});

  const mouseRef = useRef<XY>({x: 0, y: 0});
  const animationFrameRef = useRef<number | null>(null);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  // 单一鼠标监听 + RAF 平滑
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {x: e.clientX, y: e.clientY};
    };

    const animate = () => {
      setSmoothedMouse((prev) => {
        const target = mouseRef.current;

        const nextX = prev.x + (target.x - prev.x) * 0.18;
        const nextY = prev.y + (target.y - prev.y) * 0.18;

        return {
          x: Math.abs(nextX - prev.x) < 0.01 ? target.x : nextX,
          y: Math.abs(nextY - prev.y) < 0.01 ? target.y : nextY,
        };
      });

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, {passive: true});
    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 紫色角色眨眼
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
    let resetTimeout: ReturnType<typeof setTimeout> | null = null;

    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);

        resetTimeout = setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());
    };

    scheduleBlink();

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (resetTimeout) clearTimeout(resetTimeout);
    };
  }, []);

  // 黑色角色眨眼
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
    let resetTimeout: ReturnType<typeof setTimeout> | null = null;

    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);

        resetTimeout = setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());
    };

    scheduleBlink();

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (resetTimeout) clearTimeout(resetTimeout);
    };
  }, []);

  // 输入时互看
  useEffect(() => {
    if (!isTyping) {
      setIsLookingAtEachOther(false);
      return;
    }

    setIsLookingAtEachOther(true);
    const timer = setTimeout(() => {
      setIsLookingAtEachOther(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isTyping]);

  // 密码可见时紫色偷看
  useEffect(() => {
    if (!(password.length > 0 && showPassword)) {
      setIsPurplePeeking(false);
      return;
    }

    let peekInterval: ReturnType<typeof setTimeout> | null = null;
    let peekReset: ReturnType<typeof setTimeout> | null = null;

    const schedulePeek = () => {
      peekInterval = setTimeout(() => {
        setIsPurplePeeking(true);

        peekReset = setTimeout(() => {
          setIsPurplePeeking(false);
          schedulePeek();
        }, 800);
      }, Math.random() * 3000 + 2000);
    };

    schedulePeek();

    return () => {
      if (peekInterval) clearTimeout(peekInterval);
      if (peekReset) clearTimeout(peekReset);
    };
  }, [password, showPassword]);

  const calculateCharacterMotion = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) {
      return {
        faceX: 0,
        faceY: 0,
        bodySkew: 0,
        centerX: 0,
        centerY: 0,
      };
    }

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = smoothedMouse.x - centerX;
    const deltaY = smoothedMouse.y - centerY;

    return {
      faceX: clamp(deltaX / 20, -15, 15),
      faceY: clamp(deltaY / 30, -10, 10),
      bodySkew: clamp(-deltaX / 120, -6, 6),
      centerX,
      centerY,
    };
  };

  const purplePos = calculateCharacterMotion(purpleRef);
  const blackPos = calculateCharacterMotion(blackRef);
  const yellowPos = calculateCharacterMotion(yellowRef);
  const orangePos = calculateCharacterMotion(orangeRef);

  const purpleEyeOffset = useMemo(() => {
    if (password.length > 0 && showPassword) {
      return isPurplePeeking ? {x: 4, y: 5} : {x: -4, y: -4};
    }
    if (isLookingAtEachOther) {
      return {x: 3, y: 4};
    }

    return getLookOffset(
      {x: purplePos.centerX, y: purplePos.centerY},
      smoothedMouse,
      5
    );
  }, [
    password.length,
    showPassword,
    isPurplePeeking,
    isLookingAtEachOther,
    purplePos.centerX,
    purplePos.centerY,
    smoothedMouse,
  ]);

  const blackEyeOffset = useMemo(() => {
    if (password.length > 0 && showPassword) {
      return {x: -4, y: -4};
    }
    if (isLookingAtEachOther) {
      return {x: 0, y: -4};
    }

    return getLookOffset(
      {x: blackPos.centerX, y: blackPos.centerY},
      smoothedMouse,
      4
    );
  }, [
    password.length,
    showPassword,
    isLookingAtEachOther,
    blackPos.centerX,
    blackPos.centerY,
    smoothedMouse,
  ]);

  const orangeEyeOffset = useMemo(() => {
    if (password.length > 0 && showPassword) {
      return {x: -5, y: -4};
    }

    return getLookOffset(
      {x: orangePos.centerX, y: orangePos.centerY},
      smoothedMouse,
      5
    );
  }, [password.length, showPassword, orangePos.centerX, orangePos.centerY, smoothedMouse]);

  const yellowEyeOffset = useMemo(() => {
    if (password.length > 0 && showPassword) {
      return {x: -5, y: -4};
    }

    return getLookOffset(
      {x: yellowPos.centerX, y: yellowPos.centerY},
      smoothedMouse,
      5
    );
  }, [password.length, showPassword, yellowPos.centerX, yellowPos.centerY, smoothedMouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (email === "erik@gmail.com" && password === "1234") {
      console.log("✅ Login successful!");
      alert("Login successful! Welcome, Erik!");
    } else {
      setError("Invalid email or password. Please try again.");
      // console.log("❌ Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div
        className="relative hidden min-h-screen lg:flex flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-12 text-primary-foreground overflow-hidden">
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div
              className="size-8 rounded-lg bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="size-4"/>
            </div>
            <span>YourBrand</span>
          </div>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <div className="relative" style={{width: "550px", height: "400px"}}>
            {/* Purple */}
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out will-change-transform"
              style={{
                left: "70px",
                width: "180px",
                height:
                  isTyping || (password.length > 0 && !showPassword) ? "440px" : "400px",
                backgroundColor: "#6C3FF5",
                borderRadius: "10px 10px 0 0",
                zIndex: 1,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isTyping || (password.length > 0 && !showPassword)
                    ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
                    : `skewX(${purplePos.bodySkew}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "20px"
                      : isLookingAtEachOther
                      ? "55px"
                      : `${45 + purplePos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "35px"
                      : isLookingAtEachOther
                      ? "65px"
                      : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  offsetX={purpleEyeOffset.x}
                  offsetY={purpleEyeOffset.y}
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  offsetX={purpleEyeOffset.x}
                  offsetY={purpleEyeOffset.y}
                />
              </div>
            </div>

            {/* Black */}
            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out will-change-transform"
              style={{
                left: "240px",
                width: "120px",
                height: "310px",
                backgroundColor: "#2D2D2D",
                borderRadius: "8px 8px 0 0",
                zIndex: 2,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isLookingAtEachOther
                    ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
                    : isTyping || (password.length > 0 && !showPassword)
                      ? `skewX(${blackPos.bodySkew * 1.5}deg)`
                      : `skewX(${blackPos.bodySkew}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "10px"
                      : isLookingAtEachOther
                      ? "32px"
                      : `${26 + blackPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "28px"
                      : isLookingAtEachOther
                      ? "12px"
                      : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  offsetX={blackEyeOffset.x}
                  offsetY={blackEyeOffset.y}
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  offsetX={blackEyeOffset.x}
                  offsetY={blackEyeOffset.y}
                />
              </div>
            </div>

            {/* Orange */}
            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out will-change-transform"
              style={{
                left: "0px",
                width: "240px",
                height: "200px",
                zIndex: 3,
                backgroundColor: "#FF9B6B",
                borderRadius: "120px 120px 0 0",
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : `skewX(${orangePos.bodySkew}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "50px"
                      : `${82 + orangePos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "85px"
                      : `${90 + orangePos.faceY}px`,
                }}
              >
                <Pupil
                  size={12}
                  pupilColor="#2D2D2D"
                  offsetX={orangeEyeOffset.x}
                  offsetY={orangeEyeOffset.y}
                />
                <Pupil
                  size={12}
                  pupilColor="#2D2D2D"
                  offsetX={orangeEyeOffset.x}
                  offsetY={orangeEyeOffset.y}
                />
              </div>
            </div>

            {/* Yellow */}
            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out will-change-transform"
              style={{
                left: "310px",
                width: "140px",
                height: "230px",
                backgroundColor: "#E8D754",
                borderRadius: "70px 70px 0 0",
                zIndex: 4,
                transform:
                  password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : `skewX(${yellowPos.bodySkew}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "20px"
                      : `${52 + yellowPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "35px"
                      : `${40 + yellowPos.faceY}px`,
                }}
              >
                <Pupil
                  size={12}
                  pupilColor="#2D2D2D"
                  offsetX={yellowEyeOffset.x}
                  offsetY={yellowEyeOffset.y}
                />
                <Pupil
                  size={12}
                  pupilColor="#2D2D2D"
                  offsetX={yellowEyeOffset.x}
                  offsetY={yellowEyeOffset.y}
                />
              </div>

              <div
                className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{
                  left:
                    password.length > 0 && showPassword
                      ? "10px"
                      : `${40 + yellowPos.faceX}px`,
                  top:
                    password.length > 0 && showPassword
                      ? "88px"
                      : `${88 + yellowPos.faceY}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"/>
        <div className="absolute top-1/4 right-1/4 size-64 bg-primary-foreground/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-primary-foreground/5 rounded-full blur-3xl"/>
      </div>

      {/* 你原来的右侧登录表单如果有，可以接着放这里 */}
      <form onSubmit={handleSubmit} className="hidden">
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 300);
          }}
        />
        <input
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 300);
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
        />
        <button type="submit" disabled={isLoading}/>
        {error && <div>{error}</div>}
      </form>
    </div>
  );
}

export const Component = LoginPage;
