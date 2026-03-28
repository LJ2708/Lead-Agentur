export function useHaptic() {
  return {
    light: () => navigator?.vibrate?.(10),
    medium: () => navigator?.vibrate?.(20),
    heavy: () => navigator?.vibrate?.(30),
    success: () => navigator?.vibrate?.([10, 50, 10]),
    error: () => navigator?.vibrate?.([30, 100, 30]),
  }
}
