// Re-export subscription service for compatibility
export * from './subscription.service'
export { subscriptionService as default } from './subscription.service'

// Export specific functions for convenience
export const getUserSubscription = (userId: string) =>
  subscriptionService.getUserSubscription(userId)

export const hasFeatureAccess = (
  userId: string,
  feature: keyof typeof import('./config').SUBSCRIPTION_TIERS.FREE.features
) => subscriptionService.hasFeatureAccess(userId, feature)

// Import service
import { subscriptionService } from './subscription.service'