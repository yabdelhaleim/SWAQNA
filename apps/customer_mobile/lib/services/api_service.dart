// lib/services/api_service.dart
import 'dart:convert';
import 'dart:io';
import '../models/address_model.dart';
import '../models/reel_comment_model.dart';

class ApiService {
  // ✅ localhost للـ Android Emulator يستخدم 10.0.2.2 — للـ real device غيّرها لـ IP الكمبيوتر
  static String _baseUrl = 'http://10.0.2.2:8000/api/v1';
  static String? _token;

  static void setBaseUrl(String url) => _baseUrl = url;
  static void setToken(String token) => _token = token;
  static void clearToken() => _token = null;

  // ─── HTTP Helpers ─────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> _post(
      String endpoint, Map<String, dynamic> body) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final request =
          await client.postUrl(Uri.parse('$_baseUrl$endpoint'));
      request.headers.set('content-type', 'application/json');
      request.headers.set('accept', 'application/json');
      if (_token != null) {
        request.headers.set('authorization', 'Bearer $_token');
      }
      request.add(utf8.encode(jsonEncode(body)));
      final response = await request.close();
      final resBody = await response.transform(utf8.decoder).join();
      client.close();
      final decoded = jsonDecode(resBody);
      if (response.statusCode >= 400) {
        throw Exception(decoded['message'] ?? 'خطأ ${response.statusCode}');
      }
      return decoded as Map<String, dynamic>;
    } catch (e) {
      client.close();
      rethrow;
    }
  }

  static Future<dynamic> _get(String endpoint) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final request =
          await client.getUrl(Uri.parse('$_baseUrl$endpoint'));
      request.headers.set('accept', 'application/json');
      if (_token != null) {
        request.headers.set('authorization', 'Bearer $_token');
      }
      final response = await request.close();
      final resBody = await response.transform(utf8.decoder).join();
      client.close();
      final decoded = jsonDecode(resBody);
      if (response.statusCode >= 400) {
        throw Exception((decoded as Map?)?['message'] ?? 'خطأ ${response.statusCode}');
      }
      return decoded;
    } catch (e) {
      client.close();
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _put(
      String endpoint, Map<String, dynamic> body) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final request =
          await client.putUrl(Uri.parse('$_baseUrl$endpoint'));
      request.headers.set('content-type', 'application/json');
      request.headers.set('accept', 'application/json');
      if (_token != null) {
        request.headers.set('authorization', 'Bearer $_token');
      }
      request.add(utf8.encode(jsonEncode(body)));
      final response = await request.close();
      final resBody = await response.transform(utf8.decoder).join();
      client.close();
      final decoded = jsonDecode(resBody);
      if (response.statusCode >= 400) {
        throw Exception(decoded['message'] ?? 'خطأ ${response.statusCode}');
      }
      return decoded as Map<String, dynamic>;
    } catch (e) {
      client.close();
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _delete(String endpoint) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final request =
          await client.deleteUrl(Uri.parse('$_baseUrl$endpoint'));
      request.headers.set('accept', 'application/json');
      if (_token != null) {
        request.headers.set('authorization', 'Bearer $_token');
      }
      final response = await request.close();
      final resBody = await response.transform(utf8.decoder).join();
      client.close();
      final decoded = jsonDecode(resBody);
      if (response.statusCode >= 400) {
        throw Exception(decoded['message'] ?? 'خطأ ${response.statusCode}');
      }
      return decoded as Map<String, dynamic>;
    } catch (e) {
      client.close();
      rethrow;
    }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> sendOtp(String phone) async {
    return _post('/auth/send-otp', {'phone': phone});
  }

  static Future<Map<String, dynamic>> verifyOtp(
      String phone, String otp) async {
    return _post('/auth/verify-otp', {'phone': phone, 'otp': otp});
  }

  static Future<Map<String, dynamic>> register({
    required String name,
    required String phone,
    required String otp,
  }) async {
    return _post('/auth/register', {
      'name': name,
      'phone': phone,
      'otp': otp,
    });
  }

  // ─── Reels ────────────────────────────────────────────────────────────────

  static Future<List<dynamic>> getReels({int page = 1, String? category}) async {
    final cat = (category != null && category != 'الكل')
        ? '&category=${Uri.encodeComponent(category)}'
        : '';
    final res = await _get('/reels?page=$page$cat');
    return (res is Map && res['data'] != null) ? res['data'] : [];
  }

  /// يرجع last_page من الـ response
  static Future<Map<String, dynamic>> getReelsPaginated(
      {int page = 1, String? category}) async {
    final cat = (category != null && category != 'الكل')
        ? '&category=${Uri.encodeComponent(category)}'
        : '';
    final res = await _get('/reels?page=$page$cat');
    if (res is Map) {
      return {
        'data': res['data'] ?? [],
        'last_page': res['last_page'] ?? 1,
      };
    }
    return {'data': [], 'last_page': 1};
  }

  // ─── Customer Orders ──────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> placeOrder({
    required String merchantId,
    required List<Map<String, dynamic>> items,
    required String address,
    String? notes,
    String? couponCode,
  }) async {
    return _post('/customer/orders', {
      'merchant_id': merchantId,
      'items': items,
      'delivery_address': address,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode,
    });
  }

  static Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required double subtotal,
    String? merchantId,
  }) async {
    return _post('/customer/coupons/validate', {
      'code': code,
      'subtotal': subtotal,
      if (merchantId != null) 'merchant_id': merchantId,
    });
  }

  static Future<List<dynamic>> getMyOrders() async {
    final res = await _get('/customer/orders');
    return (res is Map && res['data'] != null) ? res['data'] : [];
  }

  static Future<Map<String, dynamic>> getOrderDetails(dynamic orderId) async {
    final res = await _get('/customer/orders/$orderId');
    return (res is Map && res['data'] != null) ? res['data'] : {};
  }

  static Future<Map<String, dynamic>> cancelOrder(dynamic orderId, {String? reason}) async {
    final res = await _post('/customer/orders/$orderId/cancel', {
      'reason': reason ?? 'تم الإلغاء بواسطة العميل',
    });
    return res['data'] is Map<String, dynamic>
        ? res['data'] as Map<String, dynamic>
        : res;
  }

  // ─── Explore, Search & Stores ─────────────────────────────────────────────

  static Future<Map<String, dynamic>> getExploreData(
      {String? category, String? sort}) async {
    String q = '';
    if (category != null && category != 'الكل') {
      q += '?category=${Uri.encodeComponent(category)}';
    }
    if (sort != null && sort.isNotEmpty) {
      q += '${q.isEmpty ? '?' : '&'}sort=$sort';
    }
    final res = await _get('/explore$q');
    return (res is Map && res['data'] != null) ? res['data'] : {};
  }

  static Future<Map<String, dynamic>> search(String query) async {
    final res = await _get('/search?q=${Uri.encodeComponent(query)}');
    return (res is Map && res['data'] != null) ? res['data'] : {};
  }

  static Future<Map<String, dynamic>> getMerchantDetails(String id) async {
    final res = await _get('/merchants/$id');
    return (res is Map && res['data'] != null) ? res['data'] : {};
  }

  static Future<Map<String, dynamic>> getProductDetails(String id) async {
    final res = await _get('/products/$id');
    return (res is Map && res['data'] != null) ? res['data'] : {};
  }

  // ─── Reels Interactions (Like, Save, Favorites) ───────────────────────────

  static Future<Map<String, dynamic>> toggleLike(String reelId) async {
    return _post('/reels/$reelId/like', {});
  }

  static Future<Map<String, dynamic>> toggleSave(String reelId) async {
    return _post('/reels/$reelId/save', {});
  }

  static Future<List<dynamic>> getFavorites() async {
    final res = await _get('/customer/favorites');
    return (res is Map && res['data'] != null) ? res['data'] : [];
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  static Future<List<AddressModel>> getAddresses() async {
    final res = await _get('/customer/addresses');
    if (res is Map && res['data'] is List) {
      return (res['data'] as List)
          .map((item) => AddressModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  static Future<AddressModel> createAddress(Map<String, dynamic> data) async {
    final res = await _post('/customer/addresses', data);
    return AddressModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  static Future<AddressModel> updateAddress(String id, Map<String, dynamic> data) async {
    final res = await _put('/customer/addresses/$id', data);
    return AddressModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  static Future<void> deleteAddress(String id) async {
    await _delete('/customer/addresses/$id');
  }

  static Future<AddressModel> setDefaultAddress(String id) async {
    final res = await _post('/customer/addresses/$id/set-default', {});
    return AddressModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  // ─── Order Reviews ────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> submitOrderReview({
    required String orderId,
    required int rating,
    String? comment,
    List<String>? tags,
  }) async {
    return _post('/customer/orders/$orderId/review', {
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
      if (tags != null && tags.isNotEmpty) 'tags': tags,
    });
  }

  static Future<Map<String, dynamic>?> getOrderReview(String orderId) async {
    final res = await _get('/customer/orders/$orderId/review');
    if (res is Map && res['data'] != null) {
      return res['data'] as Map<String, dynamic>;
    }
    return null;
  }

  // ─── Customer Notifications ───────────────────────────────────────────────

  static Future<Map<String, dynamic>> getNotifications({int page = 1}) async {
    final res = await _get('/customer/notifications?page=$page');
    if (res is Map) {
      return {
        'unread_count': res['unread_count'] ?? 0,
        'data': res['data'] ?? [],
        'current_page': res['current_page'] ?? 1,
        'last_page': res['last_page'] ?? 1,
      };
    }
    return {'unread_count': 0, 'data': [], 'current_page': 1, 'last_page': 1};
  }

  static Future<void> markNotificationAsRead(String id) async {
    await _post('/customer/notifications/$id/read', {});
  }

  static Future<void> markAllNotificationsAsRead() async {
    await _post('/customer/notifications/mark-all-read', {});
  }

  // ─── WebSocket Channel Authentication (Pusher Protocol) ───────────────────

  /// يتصل بـ Laravel broadcasting/auth ويرجع الـ auth signature لـ private channel
  static Future<Map<String, dynamic>> authenticateBroadcastChannel({
    required String channel,
    required String socketId,
    required String authEndpoint,
  }) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final uri = Uri.parse(authEndpoint);
      final request = await client.postUrl(uri);
      request.headers.set('content-type', 'application/json');
      request.headers.set('accept', 'application/json');
      if (_token != null) {
        request.headers.set('authorization', 'Bearer $_token');
      }
      request.add(utf8.encode(jsonEncode({
        'channel_name': channel,
        'socket_id': socketId,
      })));
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();
      client.close();
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (e) {
      client.close();
      rethrow;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // تعليقات الريلز (Reel Comments)
  // ─────────────────────────────────────────────────────────────────────────

  /// جلب تعليقات ريل معين (عام — بدون توكن)
  static Future<Map<String, dynamic>> getReelComments(
    String reelId, {
    String? cursor,
  }) async {
    final params = cursor != null ? '?cursor=$cursor' : '';
    final res = await _get('/reels/$reelId/comments$params');
    final data = res as Map<String, dynamic>;
    final rawList = data['data'] as List? ?? [];
    return {
      'comments':    rawList.map((e) => ReelCommentModel.fromJson(e as Map<String, dynamic>)).toList(),
      'next_cursor': data['next_cursor'],
      'has_more':    data['has_more'] ?? false,
      'reel':        data['reel'] ?? {},
    };
  }

  /// نشر تعليق جديد (requires auth)
  static Future<ReelCommentModel> postReelComment(
    String reelId,
    String comment, {
    String? parentId,
  }) async {
    final body = <String, dynamic>{'comment': comment};
    if (parentId != null) body['parent_id'] = parentId;
    final res = await _post('/reels/$reelId/comments', body);
    return ReelCommentModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  /// تبديل إعجاب على تعليق (requires auth)
  static Future<Map<String, dynamic>> toggleCommentLike(String commentId) async {
    return await _post('/comments/$commentId/like', {});
  }

  /// حذف تعليق (requires auth — صاحبه فقط)
  static Future<void> deleteReelComment(String commentId) async {
    await _delete('/comments/$commentId');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // الملف الشخصي للعميل (Customer Profile)
  // ─────────────────────────────────────────────────────────────────────────

  /// جلب بيانات الملف الشخصي للعميل مع الإحصائيات
  static Future<Map<String, dynamic>> getProfile() async {
    final res = await _get('/customer/profile');
    return (res as Map<String, dynamic>)['data'] as Map<String, dynamic>;
  }

  /// تحديث بيانات الملف الشخصي للعميل
  static Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    String? email,
    String? avatarUrl,
  }) async {
    final body = <String, dynamic>{
      'full_name': fullName,
      if (email != null && email.isNotEmpty) 'email': email,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    };
    final res = await _put('/customer/profile', body);
    return res['data'] as Map<String, dynamic>;
  }
}

