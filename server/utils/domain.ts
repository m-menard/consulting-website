'use strict';
/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */
/**
 * Get the correct domain for webhooks and callbacks
 * Works in both development and production environments
 * 
 * Environment Variables:
 * - APP_DOMAIN: Primary domain for the application (e.g., "app.yourdomain.com")
 * - DEV_DOMAIN: Explicit development domain override
 * - DEV_DOMAIN: Runtime-managed development domain
 * - NODE_ENV: Set to "production" in production environments
 */
export function getDomain(fallbackHost?: string): string {
  let domain: string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In development environment, use dev domain for correct webhook URLs
  // Priority: DEV_DOMAIN (explicit) > DEV_DOMAIN (runtime-managed)
  if (!isProduction) {
    if (process.env.DEV_DOMAIN) {
      domain = process.env.DEV_DOMAIN;
    } else if (process.env.DEV_DOMAIN) {
      domain = process.env.DEV_DOMAIN;
    }
  }
  
  // In production or if no dev domain found, use APP_DOMAIN
  if (!domain && process.env.APP_DOMAIN) {
    domain = process.env.APP_DOMAIN;
  }
  
  // Fallback to the host header from request
  if (!domain && fallbackHost) {
    domain = fallbackHost;
  }
  
  if (!domain) {
    throw new Error('Unable to determine domain for webhooks. Please set APP_DOMAIN environment variable.');
  }
  
  // Ensure domain always has https:// protocol prefix
  // This is required for proper URL generation (webhooks, WebSocket streams, etc.)
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }
  
  return domain;
}
