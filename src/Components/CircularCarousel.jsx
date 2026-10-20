import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

import "./CircularCarousel.css";

function CircularCarousel({
  items = [],
  speed = 0.035,
  cardWidth = 250,
  cardHeight = 360,
  gap = 28,
  perspective = 2500,
  pauseOnHover = true,
  captions = true,
}) {
  const stageRef = useRef(null);
  const ringRef = useRef(null);
  const cardsRef = useRef([]);
  const frameRef = useRef(null);
  const resizeTimerRef = useRef(null);

  const rotationRef = useRef(0);
  const velocityRef = useRef(-speed);
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);

  const pointerStartRef = useRef(0);
  const rotationStartRef = useRef(0);
  const lastPointerRef = useRef(0);

  const geometryRef = useRef({
    radius: 650,
    step: 0,
    cardWidth,
    cardHeight,
  });

  const normalizeAngle = useCallback((angle) => {
    let result = angle % 360;

    if (result > 180) result -= 360;
    if (result < -180) result += 360;

    return result;
  }, []);

  const calculateGeometry = useCallback(() => {
    const stage = stageRef.current;

    if (!stage || items.length === 0) return;

    const width = stage.clientWidth;

    let currentWidth = cardWidth;
    let currentHeight = cardHeight;

    if (width <= 600) {
      currentWidth = Math.min(width * 0.58, 210);
      currentHeight = currentWidth * (cardHeight / cardWidth);
    } else if (width <= 900) {
      currentWidth = Math.min(cardWidth, 220);
      currentHeight = currentWidth * (cardHeight / cardWidth);
    }

    const circumference = items.length * (currentWidth + gap);
    const radius = Math.max(currentWidth * 1.5, circumference / (2 * Math.PI));

    geometryRef.current = {
      radius,
      step: 360 / items.length,
      cardWidth: currentWidth,
      cardHeight: currentHeight,
    };

    cardsRef.current.forEach((card) => {
      if (!card) return;

      card.style.width = `${currentWidth}px`;
      card.style.height = `${currentHeight}px`;
    });
  }, [items.length, cardWidth, cardHeight, gap]);

  const renderRing = useCallback(() => {
    const ring = ringRef.current;

    if (!ring || items.length === 0) return;

    const { radius, step } = geometryRef.current;

    cardsRef.current.forEach((card, index) => {
      if (!card) return;

      const angle = rotationRef.current + index * step;
      const radians = (angle * Math.PI) / 180;

      const x = Math.sin(radians) * radius;
      const z = Math.cos(radians) * radius;

      const normalized = normalizeAngle(angle);
      const depth = (z + radius) / (2 * radius);
      const distance = Math.abs(normalized) / 180;

      const scale = 0.72 + depth * 0.28;
      const opacity = 0.28 + depth * 0.72;
      const rotateY = -normalized * 0.92;
      const blur = Math.max(0, distance - 0.35) * 2;

      card.style.transform = `
    translate3d(${x}px, 0, ${z}px)
    rotateY(${rotateY}deg)
    scale(${scale})
  `;

      card.style.opacity = String(opacity);
      card.style.filter = `blur(${blur}px)`;
      card.style.zIndex = String(Math.round(depth * 1000));
    });

    ring.style.transform = "translate3d(0, 0, 0)";
  }, [items.length, normalizeAngle]);

  const animationLoop = useCallback(
    (time) => {
      if (!draggingRef.current && !pausedRef.current) {
        rotationRef.current += velocityRef.current * Math.min(32, 16);
      }

      renderRing();
      frameRef.current = requestAnimationFrame(animationLoop);
    },
    [renderRing],
  );

  const snapToIndex = useCallback(
    (index) => {
      const { step } = geometryRef.current;

      const target = -index * step;
      const current = rotationRef.current;

      let difference = target - current;

      while (difference > 180) difference -= 360;
      while (difference < -180) difference += 360;

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      gsap.to(rotationRef, {
        current: current + difference,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: renderRing,
        onComplete: () => {
          frameRef.current = requestAnimationFrame(animationLoop);
        },
      });

      velocityRef.current = 0;
    },
    [animationLoop, renderRing],
  );

  const handlePointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    draggingRef.current = true;
    pointerStartRef.current = event.clientX;
    lastPointerRef.current = event.clientX;
    rotationStartRef.current = rotationRef.current;

    stageRef.current?.setPointerCapture(event.pointerId);
    stageRef.current?.classList.add("is-dragging");
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;

    const delta = event.clientX - pointerStartRef.current;
    const instantDelta = event.clientX - lastPointerRef.current;

    rotationRef.current = rotationStartRef.current + delta * 0.22;
    velocityRef.current = instantDelta * 0.018;

    lastPointerRef.current = event.clientX;

    renderRing();
  };

  const handlePointerUp = (event) => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    try {
      stageRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Le pointeur peut déjà avoir été libéré.
    }

    stageRef.current?.classList.remove("is-dragging");

    velocityRef.current = Math.max(-0.45, Math.min(0.45, velocityRef.current));
  };

  useEffect(() => {
    calculateGeometry();
    renderRing();

    frameRef.current = requestAnimationFrame(animationLoop);

    const handleResize = () => {
      clearTimeout(resizeTimerRef.current);

      resizeTimerRef.current = setTimeout(() => {
        calculateGeometry();
        renderRing();
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(resizeTimerRef.current);
      window.removeEventListener("resize", handleResize);
      gsap.killTweensOf(rotationRef);
    };
  }, [calculateGeometry, renderRing, animationLoop]);

  return (
    <div
      className="circular-carousel"
      style={{ "--carousel-perspective": `${perspective}px` }}
    >
      <div
        className="circular-carousel__stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => {
          if (pauseOnHover) pausedRef.current = true;
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) pausedRef.current = false;
        }}
      >
        {" "}
        <div className="circular-carousel__ring" ref={ringRef}>
          {items.map((item, index) => (
            <button
              type="button"
              className="circular-carousel__card"
              key={item.id ?? item.title ?? index}
              ref={(element) => {
                cardsRef.current[index] = element;
              }}
              onClick={() => snapToIndex(index)}
              aria-label={`Explorer ${item.title ?? item.name ?? "cette catégorie"}`}
            >
              {" "}
              <span className="circular-carousel__media">
                <img
                  src={item.image ?? item.src ?? item.url}
                  alt={item.alt ?? item.title ?? item.name ?? ""}
                  draggable="false"
                />

                <span className="circular-carousel__shade" />

                {item.category && (
                  <span className="circular-carousel__category">
                    {item.category}
                  </span>
                )}
              </span>
              {captions && (
                <span className="circular-carousel__info">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title ?? item.name}</strong>
                  {item.description && <small>{item.description}</small>}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="circular-carousel__vignette" />
      </div>
    </div>
  );
}

export default CircularCarousel;
