import * as crypto from 'crypto';

export class SecurityUtil {
  /**
   * Creates a secure cache key using SHA-256 hashing
   * @param prefix - The cache key prefix
   * @param identifier - The identifier to hash
   * @returns A secure cache key
   */
  static createSecureCacheKey(prefix: string, identifier: string): string {
    const hash = crypto.createHash('sha256').update(identifier).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Normalizes wallet addresses consistently
   * @param address - The wallet address
   * @param isEVM - Whether this is an EVM address (should be lowercased)
   * @returns Normalized address
   */
  static normalizeWalletAddress(address: string, isEVM: boolean): string {
    if (isEVM) {
      return address.toLowerCase();
    }
    // Solana addresses should not be lowercased
    return address;
  }

  /**
   * Validates JWT secret strength
   * @param secret - The JWT secret
   * @returns True if secret meets security requirements
   */
  static validateJWTSecret(secret: string): boolean {
    // Minimum 32 characters, should contain mixed case, numbers, and special characters
    if (secret.length < 32) {
      return false;
    }
    
    const hasLowerCase = /[a-z]/.test(secret);
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);
    
    return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChars;
  }

  /**
   * Generates a device ID from user agent and other request headers
   * @param userAgent - User agent string
   * @param ip - IP address
   * @returns Device fingerprint
   */
  static generateDeviceId(userAgent?: string, ip?: string): string {
    const identifier = `${userAgent || 'unknown'}:${ip || 'unknown'}`;
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
  }

  /**
   * Sanitizes user agent string to prevent XSS
   * @param userAgent - Raw user agent string
   * @returns Sanitized user agent
   */
  static sanitizeUserAgent(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    // Remove potentially dangerous characters and limit length
    return userAgent
      .replace(/[<>'"]/g, '')
      .substring(0, 500);
  }

  /**
   * Validates IP address format
   * @param ip - IP address string
   * @returns True if valid IP
   */
  static isValidIP(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Creates a random nonce for authentication
   * @returns Random 6-digit nonce
   */
  static generateNonce(): number {
    return crypto.randomInt(100000, 999999);
  }
}
