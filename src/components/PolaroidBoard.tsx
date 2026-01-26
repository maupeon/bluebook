"use client";

import { useState, useRef, useEffect } from "react";
import { Heart } from "lucide-react";

interface Polaroid {
  id: number;
  src: string;
  caption: string;
  rotation: number;
  x: number;
  y: number;
  zIndex: number;
}

const initialPolaroids: Polaroid[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop",
    caption: "María & Carlos",
    rotation: -8,
    x: 5,
    y: 10,
    zIndex: 1,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&h=400&fit=crop",
    caption: "El gran día ✨",
    rotation: 5,
    x: 25,
    y: 5,
    zIndex: 2,
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&h=400&fit=crop",
    caption: "Para siempre",
    rotation: -3,
    x: 50,
    y: 15,
    zIndex: 3,
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&h=400&fit=crop",
    caption: "Love wins 💕",
    rotation: 7,
    x: 70,
    y: 8,
    zIndex: 4,
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&h=400&fit=crop",
    caption: "15.06.2026",
    rotation: -5,
    x: 85,
    y: 20,
    zIndex: 5,
  },
];

// Pastel blue gradient backgrounds for fallback
const gradients = [
  "linear-gradient(135deg, #6b9ac4 0%, #94b8d9 100%)",
  "linear-gradient(135deg, #a8d4e6 0%, #d4e8f2 100%)",
  "linear-gradient(135deg, #89c4e8 0%, #b8d9eb 100%)",
  "linear-gradient(135deg, #7eb5d6 0%, #a3cce3 100%)",
  "linear-gradient(135deg, #9ecae1 0%, #c5ddef 100%)",
];

export function PolaroidBoard() {
  const [polaroids, setPolaroids] = useState<Polaroid[]>(initialPolaroids);
  const [dragging, setDragging] = useState<number | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    const polaroid = polaroids.find((p) => p.id === id);
    if (!polaroid || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const polaroidX = (polaroid.x / 100) * rect.width;
    const polaroidY = (polaroid.y / 100) * rect.height;

    dragOffset.current = {
      x: e.clientX - rect.left - polaroidX,
      y: e.clientY - rect.top - polaroidY,
    };

    setDragging(id);
    setMaxZIndex((prev) => prev + 1);
    setPolaroids((prev) =>
      prev.map((p) => (p.id === id ? { ...p, zIndex: maxZIndex + 1 } : p))
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

    // Constrain within bounds
    const clampedX = Math.max(0, Math.min(85, newX));
    const clampedY = Math.max(0, Math.min(70, newY));

    setPolaroids((prev) =>
      prev.map((p) =>
        p.id === dragging ? { ...p, x: clampedX, y: clampedY } : p
      )
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleTouchStart = (e: React.TouchEvent, id: number) => {
    const touch = e.touches[0];
    const polaroid = polaroids.find((p) => p.id === id);
    if (!polaroid || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const polaroidX = (polaroid.x / 100) * rect.width;
    const polaroidY = (polaroid.y / 100) * rect.height;

    dragOffset.current = {
      x: touch.clientX - rect.left - polaroidX,
      y: touch.clientY - rect.top - polaroidY,
    };

    setDragging(id);
    setMaxZIndex((prev) => prev + 1);
    setPolaroids((prev) =>
      prev.map((p) => (p.id === id ? { ...p, zIndex: maxZIndex + 1 } : p))
    );
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (dragging === null || !containerRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((touch.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
    const newY = ((touch.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(85, newX));
    const clampedY = Math.max(0, Math.min(70, newY));

    setPolaroids((prev) =>
      prev.map((p) =>
        p.id === dragging ? { ...p, x: clampedX, y: clampedY } : p
      )
    );
  };

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-64 sm:h-80 lg:h-96 select-none overflow-hidden"
    >
      {/* Soft pastel background */}
      <div className="absolute inset-0 bg-gradient-to-br from-light via-muted/50 to-white/80 rounded-2xl" />
      
      {/* Subtle pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle, #6b9ac4 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {polaroids.map((polaroid, index) => (
        <div
          key={polaroid.id}
          className={`absolute cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
            dragging === polaroid.id ? "shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"
          }`}
          style={{
            left: `${polaroid.x}%`,
            top: `${polaroid.y}%`,
            transform: `rotate(${polaroid.rotation}deg)`,
            zIndex: polaroid.zIndex,
          }}
          onMouseDown={(e) => handleMouseDown(e, polaroid.id)}
          onTouchStart={(e) => handleTouchStart(e, polaroid.id)}
        >
          {/* Polaroid frame */}
          <div className="bg-white p-2 pb-8 rounded-sm w-24 sm:w-28 lg:w-32 shadow-md">
            {/* Photo area */}
            <div
              className="aspect-square rounded-sm flex items-center justify-center relative overflow-hidden"
              style={{ background: polaroid.src ? undefined : gradients[index % gradients.length] }}
            >
              {polaroid.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={polaroid.src} 
                  alt={polaroid.caption}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <Heart className="w-8 h-8 text-white/60 fill-white/40" />
              )}
              {/* Subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
            
            {/* Caption */}
            <p className="font-body text-xs text-center text-gray-600 mt-2 truncate px-1">
              {polaroid.caption}
            </p>
          </div>
          
          {/* Push pin - soft blue tone */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-md border-2 border-primary/80">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />
          </div>
        </div>
      ))}

      {/* Instruction hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
        <p className="font-body text-xs text-secondary flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-dashed border-primary rounded animate-pulse" />
          Arrastra las fotos para organizarlas
        </p>
      </div>
    </div>
  );
}
