# Phase 1 Implementation Guide - Auth, Subscription Gate & Core CRUD

## 🎯 Goal
Make the Flutter app functional for login and basic parking management with subscription enforcement.

## ✅ Backend Implementation Status

### 1. Authentication & JWT Enhancement
**COMPLETED** ✅

#### New Endpoints Added:
- `GET /api/auth/profile` - Get user profile with subscription status
- `POST /api/auth/refresh` - Refresh JWT token

#### Features Implemented:
- JWT token with role-based claims (`userId`, `email`, `role`, `verified`)
- Token refresh mechanism for long-lived sessions
- User profile endpoint with subscription status
- Role-aware authentication middleware

#### Flutter Integration Notes:
```dart
// Token Storage (Use secure_storage package)
final FlutterSecureStorage secureStorage = FlutterSecureStorage();

// Store JWT token
await secureStorage.write(key: 'jwt_token', value: token);

// Retrieve and use in API calls
String? token = await secureStorage.read(key: 'jwt_token');
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
}
```

### 2. Subscription Enforcement Middleware
**COMPLETED** ✅

#### New Middleware: `subscriptionAuth.ts`
- `requireActiveSubscription()` - Blocks access if subscription expired
- `checkFeatureLimit()` - Enforces feature limits (parking lots, floors, etc.)
- `getSubscriptionStatus()` - Helper function for subscription info

#### Response Codes for Flutter:
- `SUBSCRIPTION_REQUIRED` - No active subscription
- `SUBSCRIPTION_EXPIRED` - Subscription expired, needs renewal
- `FEATURE_LIMIT_EXCEEDED` - Plan limit reached

#### Sample Error Response:
```json
{
  "success": false,
  "message": "Active subscription required to access this feature",
  "code": "SUBSCRIPTION_REQUIRED",
  "action": "SUBSCRIBE"
}
```

### 3. Role-Aware Routing Guards
**COMPLETED** ✅

#### User Roles Implemented:
- `user` - Basic app users (parking space seekers)
- `admin` - Parking lot administrators
- `super_admin` - System administrators

#### Authorization Matrix:
| Feature | User | Admin | Super Admin |
|---------|------|-------|-------------|
| View parking status | ✅ | ✅ | ✅ |
| Create parking lot | ❌ | ✅ (with subscription) | ✅ |
| Manage nodes/sensors | ❌ | ✅ (with subscription) | ✅ |
| Subscription management | ✅ | ✅ | ✅ |
| System administration | ❌ | ❌ | ✅ |

### 4. CRUD Endpoints with Subscription Enforcement
**COMPLETED** ✅

All parking management endpoints now include subscription enforcement:

#### Parking Lots (`/api/parking-lots/*`)
- `GET /` - List parking lots (requires active subscription)
- `GET /:id` - Get parking lot details (requires active subscription)
- `POST /` - Create parking lot (requires subscription + limit check)
- `PUT /:id` - Update parking lot (requires active subscription)
- `DELETE /:id` - Delete parking lot (requires active subscription)

#### Similar enforcement applied to:
- Floors (`/api/floors/*`)
- Parking Slots (`/api/parking-slots/*`)
- Nodes (`/api/nodes/*`)
- Gateways (`/api/gateways/*`)

### 5. Current Plan Status in Profile
**COMPLETED** ✅

#### Profile Endpoint Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "admin@example.com",
      "role": "admin",
      "firstName": "John",
      "lastName": "Doe"
    },
    "subscription": {
      "hasActiveSubscription": true,
      "status": "ACTIVE",
      "subscription": {
        "id": "sub-uuid",
        "planName": "Professional",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2025-01-01T00:00:00.000Z",
        "daysRemaining": 180,
        "isAutoRenew": true,
        "limits": {
          "gateways": 10,
          "parkingLots": 5,
          "floors": 25,
          "parkingSlots": 500,
          "users": 50
        }
      }
    }
  }
}
```

### 6. Cashfree Payment Integration
**ALREADY WORKING** ✅

Payment flow is already implemented and working fine:
- `/payments/cashfree/return` - Payment callback handler
- Flutter deep linking support with `smartparking://` scheme
- Success/failure dialog handling
- Automatic redirect to dashboard

## 📱 Flutter Implementation Checklist

### 1. ✅ Authentication Flow
```dart
// Login Implementation
Future<AuthResult> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'email': email,
      'password': password,
    }),
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    // Store token securely
    await secureStorage.write(key: 'jwt_token', value: data['data']['token']);
    return AuthResult.success(data['data']['user']);
  } else if (response.statusCode == 403) {
    final data = json.decode(response.body);
    if (data['needsVerification'] == true) {
      return AuthResult.needsVerification(email);
    }
  }

  return AuthResult.failure('Login failed');
}
```

### 2. ✅ Secure Token Storage
```dart
class SecureTokenStorage {
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  static Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
  }
}
```

### 3. ✅ Role-Aware Navigation Guards
```dart
class RouteGuard {
  static bool canAccessAdminFeatures(UserRole role) {
    return role == UserRole.admin || role == UserRole.superAdmin;
  }

  static Widget buildConditionalRoute(
    UserRole userRole,
    Widget adminWidget,
    Widget userWidget,
  ) {
    if (canAccessAdminFeatures(userRole)) {
      return adminWidget;
    }
    return userWidget;
  }
}

// Usage in route definitions
if (RouteGuard.canAccessAdminFeatures(currentUser.role)) {
  // Show admin parking lot creation screen
} else {
  // Show user parking finder screen
}
```

### 4. ✅ Subscription Status Handling
```dart
class SubscriptionService {
  static Future<SubscriptionStatus> getSubscriptionStatus() async {
    final token = await SecureTokenStorage.getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/api/auth/profile'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return SubscriptionStatus.fromJson(data['data']['subscription']);
    }

    throw Exception('Failed to fetch subscription status');
  }

  static void handleSubscriptionError(Map<String, dynamic> error) {
    switch (error['code']) {
      case 'SUBSCRIPTION_REQUIRED':
        // Navigate to subscription plans
        break;
      case 'SUBSCRIPTION_EXPIRED':
        // Show renewal dialog
        break;
      case 'FEATURE_LIMIT_EXCEEDED':
        // Show upgrade plan dialog
        break;
    }
  }
}
```

### 5. ✅ CRUD Operations with Error Handling
```dart
class ParkingLotService {
  static Future<List<ParkingLot>> getParkingLots() async {
    try {
      final token = await SecureTokenStorage.getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/api/parking-lots'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return (data['data'] as List)
            .map((item) => ParkingLot.fromJson(item))
            .toList();
      } else if (response.statusCode == 403) {
        final error = json.decode(response.body);
        SubscriptionService.handleSubscriptionError(error);
        throw SubscriptionException(error['message']);
      }

      throw Exception('Failed to fetch parking lots');
    } catch (e) {
      throw e;
    }
  }

  static Future<ParkingLot> createParkingLot(ParkingLotData data) async {
    try {
      final token = await SecureTokenStorage.getToken();
      final response = await http.post(
        Uri.parse('$baseUrl/api/parking-lots'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(data.toJson()),
      );

      if (response.statusCode == 201) {
        final responseData = json.decode(response.body);
        return ParkingLot.fromJson(responseData['data']);
      } else if (response.statusCode == 403) {
        final error = json.decode(response.body);
        if (error['code'] == 'FEATURE_LIMIT_EXCEEDED') {
          // Show upgrade dialog
          throw FeatureLimitException(error['message'], error['data']);
        }
        SubscriptionService.handleSubscriptionError(error);
        throw SubscriptionException(error['message']);
      }

      throw Exception('Failed to create parking lot');
    } catch (e) {
      throw e;
    }
  }
}
```

### 6. ✅ Subscription Plan Display
```dart
class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  SubscriptionStatus? subscriptionStatus;
  User? currentUser;

  @override
  void initState() {
    super.initState();
    loadUserProfile();
  }

  Future<void> loadUserProfile() async {
    try {
      final status = await SubscriptionService.getSubscriptionStatus();
      // Also load user data from the same endpoint
      setState(() {
        subscriptionStatus = status;
        // currentUser = ... from same API call
      });
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Profile')),
      body: Column(
        children: [
          // User info section
          UserInfoCard(user: currentUser),

          // Subscription status section
          if (subscriptionStatus != null)
            SubscriptionStatusCard(
              status: subscriptionStatus!,
              onUpgrade: () {
                // Navigate to subscription plans
              },
              onRenew: () {
                // Navigate to payment flow
              },
            ),
        ],
      ),
    );
  }
}

class SubscriptionStatusCard extends StatelessWidget {
  final SubscriptionStatus status;
  final VoidCallback onUpgrade;
  final VoidCallback onRenew;

  const SubscriptionStatusCard({
    Key? key,
    required this.status,
    required this.onUpgrade,
    required this.onRenew,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (!status.hasActiveSubscription) {
      return Card(
        color: Colors.red[100],
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(Icons.warning, color: Colors.red, size: 48),
              Text('No Active Subscription', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text('Subscribe to access admin features'),
              ElevatedButton(
                onPressed: onUpgrade,
                child: Text('Subscribe Now'),
              ),
            ],
          ),
        ),
      );
    }

    final subscription = status.subscription!;
    final isExpiring = subscription.daysRemaining <= 7;

    return Card(
      color: isExpiring ? Colors.orange[100] : Colors.green[100],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  subscription.planName,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Icon(
                  isExpiring ? Icons.warning : Icons.check_circle,
                  color: isExpiring ? Colors.orange : Colors.green,
                ),
              ],
            ),
            SizedBox(height: 8),
            Text('${subscription.daysRemaining} days remaining'),
            Text('Expires: ${DateFormat.yMMMd().format(subscription.endDate)}'),
            SizedBox(height: 12),
            Text('Plan Limits:', style: TextStyle(fontWeight: FontWeight.bold)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('• Parking Lots: ${subscription.limits.parkingLots == -1 ? "Unlimited" : subscription.limits.parkingLots}'),
                Text('• Floors: ${subscription.limits.floors == -1 ? "Unlimited" : subscription.limits.floors}'),
                Text('• Parking Slots: ${subscription.limits.parkingSlots == -1 ? "Unlimited" : subscription.limits.parkingSlots}'),
                Text('• Gateways: ${subscription.limits.gateways == -1 ? "Unlimited" : subscription.limits.gateways}'),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: [
                if (isExpiring)
                  ElevatedButton(
                    onPressed: onRenew,
                    child: Text('Renew Now'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                  ),
                SizedBox(width: 8),
                OutlinedButton(
                  onPressed: onUpgrade,
                  child: Text('Upgrade Plan'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

### 7. ✅ Payment Flow Integration (Already Working)
```dart
// Payment flow is already implemented and working
// Just ensure deep linking is configured in your Flutter app

class PaymentWebView extends StatefulWidget {
  final String paymentUrl;

  @override
  _PaymentWebViewState createState() => _PaymentWebViewState();
}

class _PaymentWebViewState extends State<PaymentWebView> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Payment')),
      body: WebView(
        initialUrl: widget.paymentUrl,
        javascriptMode: JavascriptMode.unrestricted,
        onPageStarted: (url) {
          // Handle deep link redirects
          if (url.startsWith('smartparking://')) {
            // Parse success/failure from URL
            // Show appropriate dialog
            // Navigate to dashboard
          }
        },
      ),
    );
  }
}
```

## 🚀 Next Steps for Flutter Development

1. **Implement Authentication Screens**
   - Login/Signup forms
   - OTP verification
   - Password reset flow

2. **Build CRUD Screens**
   - Parking Lot management (Create, Edit, List)
   - Floor management (nested in lots)
   - Parking Slot management (nested in floors)
   - Node management (nested in slots)

3. **Add Subscription Management**
   - Profile screen with subscription status
   - Subscription plans screen
   - Payment integration (already working)

4. **Implement Error Handling**
   - Subscription error dialogs
   - Feature limit warnings
   - Network error handling

5. **Add Navigation Guards**
   - Role-based screen access
   - Subscription-based feature gating

## 🔧 Testing Commands

Run these commands to test the backend implementation:

```bash
# Test authentication
node test-auth.js

# Test subscription system
node test-subscription.js

# Test parking lot management
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test subscription enforcement
curl -X POST http://localhost:3000/api/parking-lots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lot","address":"123 Test St"}'
```

## ✅ Phase 1 Complete!

All backend components for Phase 1 are now implemented and ready for Flutter integration:

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control
- ✅ Subscription enforcement middleware
- ✅ Feature limit checking
- ✅ User profile with subscription status
- ✅ All CRUD endpoints protected
- ✅ Cashfree payment integration (already working)

The Flutter app can now be built using these APIs with proper subscription gating and role-based access control.