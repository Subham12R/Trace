import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'

/**
 * Animates a numeric value from its previous value to `target` whenever
 * `target` changes. Returns the current in-flight value (or null when target
 * is null so callers can show a skeleton instead).
 *
 * Uses the same spring-y ease as the rest of the app ([0.16, 1, 0.3, 1]).
 */
export function useCountUp(
  target: number | null,
  duration = 1.1,
  delay = 0,
): number | null {
  const [current, setCurrent] = useState<number>(0)
  const prevRef = useRef<number>(0)

  useEffect(() => {
    if (target === null) return

    const controls = animate(prevRef.current, target, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setCurrent(v),
      onComplete: () => {
        prevRef.current = target
      },
    })

    return () => controls.stop()
    // intentionally omit duration/delay — only re-run when target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return target === null ? null : current
}
