"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";


interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  // eslint-disable-next-line react-hooks/refs -- intentional: reading ref for position calculation
  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};




interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  // eslint-disable-next-line react-hooks/refs -- intentional: reading ref for position calculation
  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};




interface ComponentProps {
  children: React.ReactNode;
  mode?: "sign-in" | "sign-up";
}

function Component({ children, mode = "sign-in" }: ComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // State-driven positions for React render (updated at lower frequency)
  const [positions, setPositions] = useState({
    purple: { faceX: 0, faceY: 0, bodySkew: 0 },
    black: { faceX: 0, faceY: 0, bodySkew: 0 },
    yellow: { faceX: 0, faceY: 0, bodySkew: 0 },
    orange: { faceX: 0, faceY: 0, bodySkew: 0 },
  });

  // RAF-based mouse tracking for buttery smooth eye movement
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = e.clientX;
      mouseTarget.current.y = e.clientY;
    };

    const animate = () => {
      // Lerp for smooth following (0.12 = smoothing factor)
      mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * 0.12;
      mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * 0.12;

      const calcPos = (ref: React.RefObject<HTMLDivElement | null>, factor: number) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 3;
        const deltaX = mouseCurrent.current.x - centerX;
        const deltaY = mouseCurrent.current.y - centerY;
        return {
          faceX: Math.max(-15, Math.min(15, deltaX / 20)) * factor,
          faceY: Math.max(-10, Math.min(10, deltaY / 30)) * factor,
          bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)) * factor,
        };
      };

      setPositions({
        purple: calcPos(purpleRef, 1),
        black: calcPos(blackRef, 1.5),
        yellow: calcPos(yellowRef, 0.9),
        orange: calcPos(orangeRef, 0.8),
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Blinking - purple
  useEffect(() => {
    const scheduleBlink = () => {
      const timeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => setIsPurpleBlinking(false), 150);
        scheduleBlink();
      }, Math.random() * 3000 + 2000);
      return timeout;
    };
    const t = scheduleBlink();
    return () => clearTimeout(t);
  }, []);

  // Blinking - black
  useEffect(() => {
    const scheduleBlink = () => {
      const timeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => setIsBlackBlinking(false), 150);
        scheduleBlink();
      }, Math.random() * 3000 + 2000);
      return timeout;
    };
    const t = scheduleBlink();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true); // eslint-disable-line react-hooks/set-state-in-effect -- responding to external typing state
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }
    if (isLookingAtEachOther) setIsLookingAtEachOther(false);
  }, [isTyping, isLookingAtEachOther]);

  useEffect(() => {
    if (!password.length || !showPassword) {
      if (isPurplePeeking) setIsPurplePeeking(false); // eslint-disable-line react-hooks/set-state-in-effect -- resetting peek state
      return;
    }
    const schedulePeek = () => {
      const peekInterval = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return peekInterval;
    };
    const t = schedulePeek();
    return () => clearTimeout(t);
  }, [password, showPassword, isPurplePeeking]);

  // MutationObserver to detect Clerk password visibility toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const pwInput = document.querySelector(
        'input[name="password"]'
      ) as HTMLInputElement | null;
      if (pwInput) {
        setShowPassword(pwInput.type === "text");
      }
    });

    const formArea = formContainerRef.current ?? document.body;
    observer.observe(formArea, {
      subtree: true,
      attributes: true,
      attributeFilter: ["type"],
    });

    return () => observer.disconnect();
  }, []);

  // Detect typing in Clerk form via event delegation
  useEffect(() => {
    const container = formContainerRef.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setIsTyping(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || (related.tagName !== "INPUT" && related.tagName !== "TEXTAREA")) {
        setIsTyping(false);
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.type === "password" || target.id?.includes("password")) {
        setPassword(target.value);
      }
    };

    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);
    container.addEventListener("input", handleInput);

    return () => {
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
      container.removeEventListener("input", handleInput);
    };
  }, []);

  const passwordHasContent = password.length > 0;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Content Section */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-primary-foreground" style={{
        background: "#0a0a0f",
        backgroundImage: `
          radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.35) 0%, rgba(79,46,143,0.15) 40%, #0a0a0f 70%),
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "auto, 40px 40px, 40px 40px",
      }}>
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="size-8 rounded-lg backdrop-blur-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Sparkles className="size-4 text-violet-400" />
            </div>
            <span className="text-white">TaskFlow</span>
          </div>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          {/* Cartoon Characters */}
          <div className="relative" style={{ width: '550px', height: '400px' }}>
            {/* Purple tall rectangle character - Back layer */}
            <div
              ref={purpleRef}
              className="absolute bottom-0"
              style={{
                left: '70px',
                width: '180px',
                height: (isTyping || (passwordHasContent && !showPassword)) ? '440px' : '400px',
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transition: 'height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: (passwordHasContent && showPassword)
                  ? `skewX(0deg)`
                  : (isTyping || (passwordHasContent && !showPassword))
                    ? `skewX(${(positions.purple.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${positions.purple.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eye-covering arms (visible when password is shown) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '55%',
                  left: '10%',
                  width: '80%',
                  height: '35%',
                  backgroundColor: '#6C3FF5',
                  borderRadius: '8px 8px 0 0',
                  zIndex: 10,
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showPassword ? 'translateY(0)' : 'translateY(120%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Eyes */}
              <div
                className="absolute flex gap-8"
                style={{
                  left: (passwordHasContent && showPassword) ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + positions.purple.faceX}px`,
                  top: (passwordHasContent && showPassword) ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + positions.purple.faceY}px`,
                  transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={(passwordHasContent && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(passwordHasContent && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={(passwordHasContent && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(passwordHasContent && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            {/* Black tall rectangle character - Middle layer */}
            <div
              ref={blackRef}
              className="absolute bottom-0"
              style={{
                left: '240px',
                width: '120px',
                height: '310px',
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: (passwordHasContent && showPassword)
                  ? `skewX(0deg)`
                  : isLookingAtEachOther
                    ? `skewX(${(positions.black.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || (passwordHasContent && !showPassword))
                      ? `skewX(${(positions.black.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${positions.black.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eye-covering arms (visible when password is shown) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '55%',
                  left: '10%',
                  width: '80%',
                  height: '35%',
                  backgroundColor: '#2D2D2D',
                  borderRadius: '8px 8px 0 0',
                  zIndex: 10,
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showPassword ? 'translateY(0)' : 'translateY(120%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Eyes */}
              <div
                className="absolute flex gap-6"
                style={{
                  left: (passwordHasContent && showPassword) ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + positions.black.faceX}px`,
                  top: (passwordHasContent && showPassword) ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + positions.black.faceY}px`,
                  transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={(passwordHasContent && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(passwordHasContent && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={(passwordHasContent && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(passwordHasContent && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            {/* Orange semi-circle character - Front left */}
            <div
              ref={orangeRef}
              className="absolute bottom-0"
              style={{
                left: '0px',
                width: '240px',
                height: '200px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '120px 120px 0 0',
                transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: (passwordHasContent && showPassword) ? `skewX(0deg)` : `skewX(${positions.orange.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes - just pupils, no white */}
              <div
                className="absolute flex gap-8"
                style={{
                  left: (passwordHasContent && showPassword) ? `${50}px` : `${82 + (positions.orange.faceX || 0)}px`,
                  top: (passwordHasContent && showPassword) ? `${85}px` : `${90 + (positions.orange.faceY || 0)}px`,
                  transition: 'left 0.3s ease-out, top 0.3s ease-out',
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(passwordHasContent && showPassword) ? -5 : undefined} forceLookY={(passwordHasContent && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(passwordHasContent && showPassword) ? -5 : undefined} forceLookY={(passwordHasContent && showPassword) ? -4 : undefined} />
              </div>
            </div>

            {/* Yellow tall rectangle character - Front right */}
            <div
              ref={yellowRef}
              className="absolute bottom-0"
              style={{
                left: '310px',
                width: '140px',
                height: '230px',
                backgroundColor: '#E8D754',
                borderRadius: '70px 70px 0 0',
                zIndex: 4,
                transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: (passwordHasContent && showPassword) ? `skewX(0deg)` : `skewX(${positions.yellow.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes - just pupils, no white */}
              <div
                className="absolute flex gap-6"
                style={{
                  left: (passwordHasContent && showPassword) ? `${20}px` : `${52 + (positions.yellow.faceX || 0)}px`,
                  top: (passwordHasContent && showPassword) ? `${35}px` : `${40 + (positions.yellow.faceY || 0)}px`,
                  transition: 'left 0.3s ease-out, top 0.3s ease-out',
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(passwordHasContent && showPassword) ? -5 : undefined} forceLookY={(passwordHasContent && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(passwordHasContent && showPassword) ? -5 : undefined} forceLookY={(passwordHasContent && showPassword) ? -4 : undefined} />
              </div>
              {/* Horizontal line for mouth */}
              <div
                className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full"
                style={{
                  left: (passwordHasContent && showPassword) ? `${10}px` : `${40 + (positions.yellow.faceX || 0)}px`,
                  top: (passwordHasContent && showPassword) ? `${88}px` : `${88 + (positions.yellow.faceY || 0)}px`,
                  transition: 'left 0.3s ease-out, top 0.3s ease-out',
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>

        {/* Decorative soft orbs */}
        <div className="absolute top-1/4 right-1/4 size-64 rounded-full blur-3xl" style={{ background: "rgba(124,58,237,0.15)" }} />
        <div className="absolute bottom-1/4 left-1/4 size-96 rounded-full blur-3xl" style={{ background: "rgba(79,46,143,0.08)" }} />
      </div>

      {/* Right Login Section — Clerk form goes here */}
      <div className="flex items-center justify-center p-8" style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="w-full max-w-[420px]" ref={formContainerRef}>
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
              <Sparkles className="size-4 text-violet-500" />
            </div>
            <span>TaskFlow</span>
          </div>

          {/* Custom heading above Clerk form */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === "sign-up" ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {mode === "sign-up" ? "Sign up for your TaskFlow workspace" : "Sign in to your TaskFlow workspace"}
            </p>
          </div>

          {/* Clerk form goes here */}
          {children}
        </div>
      </div>
    </div>
  );
}

export { Component };
