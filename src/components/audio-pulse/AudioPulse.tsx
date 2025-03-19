/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import "./audio-pulse.scss";
import React from "react";
import { useEffect, useRef, useState } from "react";
import cn from "classnames";

// Number of audio pulse bars
const BAR_COUNT = 5;

export type AudioPulseProps = {
  active: boolean;
  volume: number;
  hover?: boolean;
};

export default function AudioPulse({ active, volume, hover = false }: AudioPulseProps) {
  const bars = useRef<HTMLDivElement[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Update bar heights based on volume
  useEffect(() => {
    // Only animate if active
    if (!active) {
      bars.current.forEach(bar => {
        if (bar) bar.style.height = '4px';
      });
      return;
    }
    
    let timeout: number | null = null;
    
    const update = () => {
      // Calculate heights for each bar with some randomness for a more natural effect
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        
        // Middle bars are taller than edge bars
        const middleIndex = Math.floor(BAR_COUNT / 2);
        const distanceFromMiddle = Math.abs(i - middleIndex);
        const multiplier = 1 - (distanceFromMiddle / BAR_COUNT);
        
        // Add some randomness for natural effect
        const randomness = Math.random() * 0.3 + 0.85;
        
        // Calculate height based on volume, position, and randomness
        const height = Math.min(
          36,
          4 + volume * 300 * multiplier * randomness
        );
        
        bar.style.height = `${height}px`;
      });
      
      // Continue animation loop
      timeout = window.setTimeout(update, 100);
      
      // Set animating state for CSS effects
      if (!isAnimating && volume > 0.01) {
        setIsAnimating(true);
      } else if (isAnimating && volume <= 0.01) {
        setIsAnimating(false);
      }
    };
    
    update();
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [volume, active, isAnimating]);
  
  return (
    <div 
      className={cn("audio-pulse", { 
        active, 
        hover,
        animating: isAnimating 
      })}
      aria-label={active ? "Audio visualization active" : "Audio visualization inactive"}
    >
      {Array(BAR_COUNT)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            className="pulse-bar"
            ref={(el) => {
              if (el) bars.current[i] = el;
            }}
            style={{ 
              animationDelay: `${i * 120}ms`,
              opacity: active ? 1 : 0.5,
            }}
          />
        ))}
    </div>
  );
}
