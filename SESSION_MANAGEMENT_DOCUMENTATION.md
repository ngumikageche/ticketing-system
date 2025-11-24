# HTTP Session Management, Auto-Refresh, and Hooks Implementation

This document provides a comprehensive overview of the HTTP session management, auto-refresh mechanisms, and event-driven hooks system implemented in the support ticketing system. The system uses JWT-based authentication with httpOnly cookies, automatic token refresh, and a custom hooks system for real-time updates and notifications.

## Table of Contents
1. [Overview](#overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Auto-Refresh Mechanism](#auto-refresh-mechanism)
5. [Hooks and Event System](#hooks-and-event-system)
6. [Real-Time Updates](#real-time-updates)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Security Considerations](#security-considerations)

## Overview

The system implements a stateless session management using JWT tokens stored in httpOnly cookies. Key features include:

- **Session Management**: JWT access tokens (1-hour expiry) and refresh tokens (30-day expiry) in secure cookies
- **Auto-Refresh**: Automatic token renewal on 401 responses with fallback to manual refresh
- **Hooks System**: Event-driven architecture for notifications, webhooks, and real-time updates
- **Real-Time Updates**: WebSocket connections with polling fallback
- **Cross-Site Support**: Configurable cookie settings for production HTTPS environments

## Backend Implementation

### JWT Configuration

The backend uses Flask-JWT-Extended for token management. Configuration is handled in `app/config.py`:

```python
# JWT cookie settings for using httpOnly cookies for tokens
JWT_TOKEN_LOCATION = ['cookies', 'headers']
JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', 'False').lower() in ('true', '1')
JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
JWT_REFRESH_TOKEN_EXPIRES = 30 * 24 * 3600  # 30 days
```

### Authentication Endpoints

Located in `app/routes/auth.py`, the key endpoints are:

#### Login
```python
@auth_bp.route('/login', methods=['POST'])
def login():
    # Validate credentials
    access = create_access_token(identity=str(u.id), expires_delta=datetime.timedelta(hours=1))
    refresh = create_refresh_token(identity=str(u.id), expires_delta=datetime.timedelta(days=30))
    
    resp = make_response(jsonify(body), 200)
    set_access_cookies(resp, access)
    set_refresh_cookies(resp, refresh)
    return resp
```

#### Refresh
```python
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_access():
    identity = get_jwt_identity()
    new_access = create_access_token(identity=str(identity), expires_delta=datetime.timedelta(hours=1))
    
    resp = jsonify({'msg': 'access token refreshed'})
    set_access_cookies(resp, new_access)
    return resp, 200
```

#### Logout
```python
@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = jsonify({'msg': 'logout successful'})
    unset_jwt_cookies(resp)
    return resp, 200
```

#### Get Current User
```python
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    identity = get_jwt_identity()
    user = User.active().filter_by(id=uuid.UUID(identity)).first()
    return jsonify(user.to_dict()), 200
```

### Cookie Settings

Cookies are set with the following attributes:
- `HttpOnly`: Prevents JavaScript access
- `Secure`: Set to `True` in production HTTPS environments
- `SameSite`: `None` for cross-site support, `Lax` for local development
- `Path`: `/` for access token, `/api/auth/refresh` for refresh token

## Frontend Implementation

### AuthContext (React Hook)

The `AuthContext` in `dashboard/src/contexts/AuthContext.jsx` manages authentication state:

```jsx
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  // Load current user on mount
  useEffect(() => {
    const load = async () => {
      if (window.location.pathname === '/login') {
        setLoading(false);
        return;
      }
      try {
        const user = await apiGetCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Global auth failure handler
  useEffect(() => {
    const handleFailure = () => {
      setCurrentUser(null);
      if (window.location.pathname !== '/login') {
        navigateTo('/login');
      }
    };
    registerAuthFailureHandler(handleFailure);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setCurrentUser(data.user);
    // Decode JWT for expiry tracking
    if (data.access_token) {
      const payload = decodeJwtPayload(data.access_token);
      if (payload && payload.exp) {
        const exp = payload.exp * 1000;
        setExpiresAt(exp);
        scheduleExpiryTimer(exp);
      }
    }
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {}
    setCurrentUser(null);
    navigateTo('/login');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const resp = await apiRefresh();
      const user = await apiGetCurrentUser();
      setCurrentUser(user);
      setSessionExpiring(false);
      if (resp.access_token) {
        const payload = decodeJwtPayload(resp.access_token);
        if (payload && payload.exp) {
          const exp = payload.exp * 1000;
          setExpiresAt(exp);
          scheduleExpiryTimer(exp);
        }
      }
      return true;
    } catch (err) {
      setCurrentUser(null);
      return false;
    }
  }, []);

  const scheduleExpiryTimer = (expMs) => {
    const now = Date.now();
    const msUntilExp = expMs - now;
    const warnBefore = 5 * 60 * 1000; // 5 minutes
    if (msUntilExp <= warnBefore) {
      setSessionExpiring(true);
    } else {
      setTimeout(() => setSessionExpiring(true), msUntilExp - warnBefore);
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    login,
    logout,
    refresh,
    sessionExpiring,
    expiresAt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### fetchWithAuth Wrapper

Located in `dashboard/src/api/fetchWithAuth.js`, this handles automatic refresh:

```javascript
export async function fetchWithAuth(url, opts = {}) {
  const options = { credentials: 'include', ...opts };
  options.headers = options.headers || {};

  // Add CSRF token for non-GET requests
  if (options.method && options.method.toUpperCase() !== 'GET') {
    const csrf = getCookie('csrf_access_token') || getCookie('csrf_refresh_token');
    if (csrf) {
      options.headers['X-CSRF-TOKEN'] = csrf;
    }
  }

  let response = await fetch(url, options);
  if (response.status !== 401) return response;

  // Skip refresh on login page
  if (window.location && window.location.pathname === '/login') {
    onAuthFailure();
    return response;
  }

  // Attempt refresh once
  try {
    await refreshAccess();
    response = await fetch(url, options);
    return response;
  } catch (err) {
    onAuthFailure();
    return response;
  }
}
```

### WebSocket Context

In `dashboard/src/contexts/WebSocketContext.jsx`, manages real-time connections:

```jsx
export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [realtimeData, setRealtimeData] = useState({});
  const { currentUser: authUser } = useAuth();

  // Polling fallback
  const pollNotifications = useCallback(async () => {
    if (!authUser) return;
    const data = await getNotifications();
    const filteredData = authUser ? data.filter(n => n.user_id === authUser.id) : data;
    setNotifications(filteredData);
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;

    // Load initial notifications
    const loadInitialData = async () => {
      const notificationsData = await getNotifications();
      const filteredNotifications = notificationsData.filter(n => n.user_id === authUser.id);
      setNotifications(filteredNotifications);
    };

    loadInitialData();

    // WebSocket connection
    const wsUrl = import.meta.env.VITE_WS_BASE || 'http://localhost:5000';
    const socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 3
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', { room: 'tickets' });
      socket.emit('join', { room: 'comments' });
      // ... other rooms
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      // Start polling fallback
    });

    socket.on('notification', (payload) => {
      const processed = processWebhookPayload(payload);
      if (authUser && processed.notification.user_id === authUser.id) {
        setNotifications(prev => [processed.notification, ...prev]);
      }
    });

    // ... other event listeners

    setSocket(socket);

    return () => {
      socket.close();
    };
  }, [authUser]);

  // ... polling setup and other logic
};
```

## Auto-Refresh Mechanism

### How It Works
1. **Request Interception**: `fetchWithAuth` wraps all API calls.
2. **401 Detection**: On receiving 401, attempts refresh once.
3. **Token Renewal**: Calls `POST /api/auth/refresh` with refresh cookie.
4. **Retry**: Repeats original request with new access token.
5. **Failure Handling**: On refresh failure, triggers global logout.

### Session Expiry Warning
- Decodes JWT to extract expiry time.
- Sets timer to warn user 5 minutes before expiry.
- Allows manual refresh via UI.

### Edge Cases
- Skips refresh on login page to avoid loops.
- Handles concurrent requests gracefully.
- Fallback to polling if WebSocket fails.

## Hooks and Event System

### Backend Hooks System

Located in `app/hooks.py`, provides event-driven architecture:

```python
# Registry for event handlers
_registry = defaultdict(list)

def register(event: str, func: Callable) -> None:
    _registry[event].append(func)

def send(event: str, *args, **kwargs) -> None:
    for fn in list(_registry.get(event, [])):
        try:
            fn(*args, **kwargs)
        except Exception:
            logging.exception("Error in hook handler")

# Convenience senders
def send_comment_created(comment):
    send('comment.created', comment)
    emit_realtime_event('comment', comment.to_dict())
```

### Default Handlers

Registered handlers create notifications and send webhooks:

```python
def _default_comment_created_handler(comment):
    ticket = getattr(comment, 'ticket', None)
    author = getattr(comment, 'author', None)
    author_label = author.name or author.email if author else 'Someone'

    if ticket and ticket.requester_id != comment.author_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='comment_on_ticket',
            message=f'New comment on your ticket "{ticket.subject}" by {author_label}',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment.to_dict())

    # Similar for assignee
```

### Webhook System

Sends HTTP POST requests to user-configured URLs:

```python
def send_webhook_notification(notification, data=None):
    user = notification.user
    if not user or not user.webhook_url:
        return

    payload = {
        'event': 'notification.created',
        'notification': {
            'id': str(notification.id),
            'type': notification.type,
            'message': notification.message,
            'related_id': str(notification.related_id),
            'related_type': notification.related_type,
            'created_at': notification.created_at.isoformat()
        }
    }
    if data:
        payload['data'] = data

    # Emit Socket.IO event
    socketio.emit('notification', payload)

    # Send webhook
    try:
        response = requests.post(user.webhook_url, json=payload, timeout=5)
        response.raise_for_status()
    except requests.RequestException as e:
        current_app.logger.warning(f"Failed to send webhook: {e}")
```

## Real-Time Updates

### WebSocket Events
- `notification`: New notifications
- `ticket.update`: Ticket changes
- `comment.update`: Comment changes
- `user.update`: User changes
- `message.update`: Message changes

### Polling Fallback
- Activates on WebSocket disconnect
- Polls `/api/notifications` every 30 seconds
- Filters notifications by current user

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# JWT Settings
JWT_COOKIE_SECURE=True          # Required for HTTPS
JWT_COOKIE_SAMESITE=None        # Allows cross-site
JWT_ACCESS_TOKEN_EXPIRES=3600   # 1 hour
JWT_REFRESH_TOKEN_EXPIRES=2592000  # 30 days

# Other settings
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

#### Frontend (.env)
```bash
VITE_API_BASE=https://sapi.nextek.co.ke/api
VITE_WS_BASE=https://sapi.nextek.co.ke
```

### Production Setup
1. Set `JWT_COOKIE_SECURE=True` and `JWT_COOKIE_SAMESITE=None`
2. Ensure HTTPS is enabled
3. Configure CORS to allow frontend origin with `credentials: true`
4. Restart Flask application

## Testing

### Unit Tests
- Test JWT token creation/validation
- Test hook handlers
- Test webhook sending

### Integration Tests
- Test login flow
- Test token refresh
- Test WebSocket connections

### Manual Testing
1. **Login**: Verify cookies are set with correct attributes
2. **Session Expiry**: Wait for warning, test manual refresh
3. **Auto-Refresh**: Make request after token expiry, verify automatic refresh
4. **Webhooks**: Create comment, check external service receives payload
5. **Real-Time**: Update entity, verify UI updates without refresh

### Debugging
- Check browser DevTools Network tab for cookie headers
- Monitor backend logs for hook emissions
- Use browser console for WebSocket connection status

## Security Considerations

### Cookie Security
- `HttpOnly`: Prevents XSS attacks
- `Secure`: Only sent over HTTPS
- `SameSite=None`: Allows cross-site but requires Secure

### Token Handling
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days)
- Automatic refresh prevents user disruption

### CSRF Protection
- CSRF tokens included in non-GET requests
- Double-submit cookie pattern

### Rate Limiting
- Consider implementing rate limits on refresh endpoint
- Monitor for refresh token abuse

### Webhook Security
- Validate webhook URLs
- Use HTTPS for external webhooks
- Include authentication tokens in webhook payloads if needed

This implementation provides a robust, secure, and scalable session management system with automatic token handling and real-time capabilities. The event-driven architecture allows for easy extension and integration with external services.