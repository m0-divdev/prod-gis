# 🚧 Development Authentication Guide

## Current Status: **DEVELOPMENT MODE** 🛠️

**Authentication is currently DISABLED for easier development.**

All routes are accessible without authentication headers. When you're ready for production, simply uncomment the middleware.

---

## 📋 Complete Authentication Flow Examples

### **1. Sign Message Generation**
```bash
# Get a message to sign
curl -X GET "http://localhost:4000/api/user/sign-message?walletAddress=0x1234567890123456789012345678901234567890"

# Response:
{
  "nonce": 542831,
  "msg": "Welcome to Research3! Click to sign in.\n\nThis request will not trigger a blockchain transaction or cost any gas fees, it is just a way to verify your wallet address.\n\nWallet address: 0x1234567890123456789012345678901234567890 \nNonce: 542831"
}
```

### **2. User Login (Wallet Authentication)**
```bash
# Login with signed message
curl -X POST "http://localhost:4000/api/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "signature": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "message": "Welcome to Research3! Click to sign in.\n\nThis request will not trigger a blockchain transaction or cost any gas fees, it is just a way to verify your wallet address.\n\nWallet address: 0x1234567890123456789012345678901234567890 \nNonce: 542831"
  }'

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbG0xMjM0NTY3ODkwYWJjZGVmIiwiaWF0IjoxNjk0NTQ1MjAwLCJleHAiOjE2OTQ1NTYwMDAsImF1ZCI6InJlc2VhcmNoMy11c2VycyIsImlzcyI6InJlc2VhcmNoMy1wbGF0Zm9ybSJ9.signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbG0xMjM0NTY3ODkwYWJjZGVmIiwiaWF0IjoxNjk0NTQ1MjAwLCJleHAiOjE2OTUxNTAwMDAsImF1ZCI6InJlc2VhcmNoMy11c2VycyIsImlzcyI6InJlc2VhcmNoMy1wbGF0Zm9ybSJ9.signature",
  "userId": "clm1234567890abcdef"
}
```

### **3. Frontend Integration Example**

```javascript
// React/Frontend Example
class AuthService {
  async connectWallet() {
    // 1. Get wallet address
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const walletAddress = accounts[0];

    // 2. Get sign message
    const response = await fetch(
      `http://localhost:4000/api/user/sign-message?walletAddress=${walletAddress}`
    );
    const { msg } = await response.json();

    // 3. Sign message
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress]
    });

    // 4. Login with signature
    const loginResponse = await fetch('http://localhost:4000/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        signature,
        message: msg
      })
    });

    const { accessToken, refreshToken, userId } = await loginResponse.json();
    
    // 5. Store tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);

    return { accessToken, refreshToken, userId };
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await fetch('http://localhost:4000/api/user/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const { accessToken, user } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    
    return accessToken;
  }
}
```

### **4. Session Management**

```bash
# Get all active sessions
curl -X GET "http://localhost:4000/api/user/sessions/clm1234567890abcdef" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Logout from all devices
curl -X POST "http://localhost:4000/api/user/logout-all/clm1234567890abcdef" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Revoke specific session
curl -X POST "http://localhost:4000/api/user/revoke-session/clm1234567890abcdef/clm987654321fedcba" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔧 **Enabling Authentication for Production**

### **Step 1: Uncomment Auth Middleware**

In `src/auth/auth.module.ts`, uncomment lines 20-50:

```typescript
// Change this:
/*
consumer
  .apply(AuthMiddleware)
  // ... rest of config
*/

// To this:
consumer
  .apply(AuthMiddleware)
  .exclude(
    // Health check endpoints - no auth required
    { path: '/api/health', method: RequestMethod.GET },
    
    // Authentication endpoints - no auth required  
    {
      path: '/api/user/sign-message',
      method: RequestMethod.GET,
    },
    {
      path: '/api/user/login',
      method: RequestMethod.POST,
    },
    {
      path: '/api/user/refresh-token',
      method: RequestMethod.POST,
    },
    {
      path: '/api/user/logout',
      method: RequestMethod.POST,
    },
    {
      path: '/api/user/get-user-by-refresh-token',
      method: RequestMethod.GET,
    },
  )
  .forRoutes('*');
```

### **Step 2: Uncomment Rate Limiting**

In `src/users/users.controller.ts`, uncomment the `@Throttle` decorators:

```typescript
// Uncomment these lines:
@Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 requests per minute
@Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 login attempts per minute  
@Throttle({ medium: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
```

### **Step 3: Update Environment Variables**

Ensure your `.env` has production-ready values:

```env
NODE_ENV=production
JWT_SECRET="YourSecureProductionSecret32CharsMin!@#"
ALLOWED_ORIGINS="https://yourapp.com,https://www.yourapp.com"
```

---

## 🛡️ **Security Features Summary**

### **When Auth is Enabled:**

1. **JWT Validation**: Every request validates tokens
2. **User Status Check**: Only ACTIVE users can access
3. **Rate Limiting**: Prevents brute force attacks
4. **Session Management**: Multi-device tracking
5. **Token Rotation**: Refresh tokens are rotated
6. **Security Headers**: XSS, CSRF protection
7. **Audit Trail**: All auth events logged

### **Database Schema**

```sql
-- Users with status management
User {
  id            String         @id @default(cuid())
  walletAddress String         @unique
  username      String?
  status        UserStatus     @default(ACTIVE) // ACTIVE, INACTIVE, SUSPENDED, BANNED
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

-- Enhanced refresh tokens for session management
RefreshToken {
  id        String    @id @default(cuid())
  userId    String    // Multiple tokens per user allowed
  token     String    @unique
  deviceId  String?   // Device fingerprint
  userAgent String?   // Browser/app info
  ipAddress String?   // IP tracking
  isRevoked Boolean   @default(false) // Token revocation
  lastUsed  DateTime? // Activity tracking
  expiresAt DateTime  // Expiration
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

---

## 🧪 **Testing the Auth Flow**

### **Test Sequence:**

1. **Health Check**: `GET /api/health` (always works)
2. **Get Sign Message**: `GET /api/user/sign-message?walletAddress=0x...`
3. **Login**: `POST /api/user/login` with signature
4. **Access Protected Route**: `GET /api/user/get-user/:id` with Bearer token
5. **Session Management**: `GET /api/user/sessions/:userId`
6. **Token Refresh**: `POST /api/user/refresh-token`
7. **Logout**: `POST /api/user/logout`

### **Current Dev Behavior:**
- ✅ All endpoints work without authentication
- ✅ Login flow works and returns tokens
- ✅ Tokens are generated correctly
- ✅ No rate limiting applied

### **Production Behavior (when enabled):**
- 🔐 Protected routes require Bearer token
- ⚡ Rate limiting applies
- 👤 User status is validated
- 📊 All requests are audited

---

## 📚 **API Documentation**

Visit: http://localhost:4000/api/docs

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Rate limiting information
- Example payloads

---

## 🚀 **Ready for Production Checklist**

- [ ] Uncomment auth middleware
- [ ] Uncomment rate limiting
- [ ] Set strong JWT_SECRET
- [ ] Configure ALLOWED_ORIGINS
- [ ] Test full auth flow
- [ ] Enable audit logging
- [ ] Set up monitoring

**Current Status: Development Ready ✅**
**Production Ready: 1 step away** (just uncomment the middleware)
