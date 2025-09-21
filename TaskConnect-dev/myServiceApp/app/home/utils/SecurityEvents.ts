// app/utils/SecurityEvents.ts

type EventListener = (...args: any[]) => void;

/**
 * Simple event emitter for security-related events
 * Used to communicate state changes between security-related screens
 */
class SecurityEventEmitter {
  private events: Record<string, EventListener[]>;
  
  constructor() {
    this.events = {};
  }
  
  /**
   * Subscribe to an event
   * @param event Event name
   * @param listener Callback function
   * @returns Unsubscribe function
   */
  on(event: string, listener: EventListener): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.off(event, listener);
  }
  
  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param listener Callback function to remove
   */
  off(event: string, listener: EventListener): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
  
  /**
   * Emit an event
   * @param event Event name
   * @param args Arguments to pass to listeners
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// Export a singleton instance
const securityEvents = new SecurityEventEmitter();
export default securityEvents;

// Define event names as constants for consistent usage
export const SECURITY_EVENTS = {
  APP_LOCK_CHANGED: 'appLockChanged',
  BIOMETRIC_CHANGED: 'biometricChanged',
};