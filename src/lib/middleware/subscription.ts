// Re-export subscription middleware for compatibility
export * from './subscription.middleware'

// Export specific functions for convenience
import { withSubscriptionCheck } from './subscription.middleware'

export const validateSubscription = withSubscriptionCheck
export { withSubscriptionCheck }