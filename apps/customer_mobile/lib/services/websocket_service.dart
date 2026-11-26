// lib/services/websocket_service.dart
//
// Pusher Protocol (Laravel Reverb) WebSocket client لـ Flutter
// بيتعامل مع private channels عبر Pusher Protocol v7
// لا يحتاج أي package خارجي — فقط dart:io

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../config/app_config.dart';
import 'api_service.dart';

typedef EventCallback = void Function(Map<String, dynamic> data);

class ReverbWebSocket {
  // ─── Singleton ────────────────────────────────────────────────────────────
  static final ReverbWebSocket _instance = ReverbWebSocket._internal();
  factory ReverbWebSocket() => _instance;
  ReverbWebSocket._internal();

  // ─── Config ───────────────────────────────────────────────────────────────
  static String get _wsHost => AppConfig.wsHost;
  static int get _wsPort => AppConfig.wsPort;
  static String get _appKey => AppConfig.reverbAppKey;
  static String get _authEndpoint => AppConfig.broadcastingAuthUrl;

  // ─── State ────────────────────────────────────────────────────────────────
  WebSocket? _socket;
  String? _socketId;
  bool _isConnected = false;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;

  // channels → events → callbacks
  final Map<String, Map<String, List<EventCallback>>> _listeners = {};
  // قائمة انتظار الـ subscriptions قبل الاتصال
  final List<Map<String, String>> _pendingSubscriptions = [];

  // ─── Public API ───────────────────────────────────────────────────────────

  bool get isConnected => _isConnected;

  /// الاتصال بـ Reverb WebSocket Server
  Future<void> connect() async {
    if (_isConnected) return;
    try {
      final wsUrl = '${AppConfig.wsScheme}://$_wsHost:$_wsPort/app/$_appKey'
          '?protocol=7&client=dart-reverb&version=1.0.0';

      _socket = await WebSocket.connect(wsUrl);
      _isConnected = true;
      _reconnectAttempts = 0;

      _socket!.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );

      // Ping كل 25 ثانية للحفاظ على الاتصال حياً
      _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
        _sendRaw({'event': 'pusher:ping', 'data': {}});
      });
    } catch (e) {
      _scheduleReconnect();
    }
  }

  /// قطع الاتصال بشكل نظيف
  void disconnect() {
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _socket?.close();
    _socket = null;
    _socketId = null;
    _isConnected = false;
    _listeners.clear();
    _pendingSubscriptions.clear();
  }

  /// الاشتراك في قناة private معينة والاستماع لحدث محدد
  void listenPrivate({
    required String channelName,     // مثال: 'order.{id}'
    required String eventName,       // مثال: 'OrderStatusUpdated'
    required EventCallback callback,
  }) {
    final fullChannel = 'private-$channelName';
    _listeners.putIfAbsent(fullChannel, () => {});
    _listeners[fullChannel]!.putIfAbsent(eventName, () => []);
    _listeners[fullChannel]![eventName]!.add(callback);

    if (_socketId != null) {
      // متصل → اشترك فوراً
      _subscribePrivate(fullChannel);
    } else {
      // لا يزال في الاتصال → أضفه لقائمة الانتظار
      _pendingSubscriptions.add({'channel': fullChannel, 'event': eventName});
    }
  }

  /// الاشتراك في قناة PUBLIC (بدون auth — مناسب للريلز والتعليقات)
  void listenPublic({
    required String channelName,   // مثال: 'reels.{id}'
    required String eventName,     // مثال: 'ReelCommentPosted'
    required EventCallback callback,
  }) {
    _listeners.putIfAbsent(channelName, () => {});
    _listeners[channelName]!.putIfAbsent(eventName, () => []);
    _listeners[channelName]![eventName]!.add(callback);

    if (_socketId != null) {
      _subscribePublic(channelName);
    } else {
      _pendingSubscriptions.add({'channel': channelName, 'event': eventName, 'type': 'public'});
    }
  }

  /// إلغاء الاشتراك من قناة private
  void leaveChannel(String channelName) {
    final fullChannel = 'private-$channelName';
    _listeners.remove(fullChannel);
    _sendRaw({
      'event': 'pusher:unsubscribe',
      'data': {'channel': fullChannel},
    });
  }

  /// إلغاء الاشتراك من قناة public
  void leavePublicChannel(String channelName) {
    _listeners.remove(channelName);
    _sendRaw({
      'event': 'pusher:unsubscribe',
      'data': {'channel': channelName},
    });
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  void _onMessage(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = msg['event'] as String? ?? '';
      final data = msg['data'];

      switch (event) {
        // 1. رسالة ترحيب — الخادم بعتلنا socket_id
        case 'pusher:connection_established':
          final payload = data is String ? jsonDecode(data) : data;
          _socketId = payload['socket_id'] as String?;
          // شغّل كل الـ subscriptions اللي كانت منتظرة
          for (final sub in _pendingSubscriptions) {
            if (sub['type'] == 'public') {
              _subscribePublic(sub['channel']!);
            } else {
              _subscribePrivate(sub['channel']!);
            }
          }
          _pendingSubscriptions.clear();
          // اشترك كمان في الـ channels اللي متسجلة مسبقاً
          for (final ch in _listeners.keys) {
            if (ch.startsWith('private-')) {
              _subscribePrivate(ch);
            } else {
              _subscribePublic(ch);
            }
          }

        // 2. تأكيد نجاح الاشتراك في channel
        case 'pusher_internal:subscription_succeeded':
          break;

        // 3. خطأ في الاشتراك — عادةً token منتهي
        case 'pusher:subscription_error':
          break;

        // 4. Pong — سيرفر حياً
        case 'pusher:pong':
          break;

        // 5. أي حدث تاني → ابحث عن المستمعين
        default:
          final channel = msg['channel'] as String? ?? '';
          if (_listeners.containsKey(channel)) {
            // أزل الـ prefix 'App\\Events\\' لو موجود للمقارنة
            final cleanEvent = event.replaceAll('App\\Events\\', '').split('\\').last;
            final map = _listeners[channel]!;

            // جرّب المطابقة بـ event name الكامل أو المختصر
            for (final key in map.keys) {
              if (key == event || key == cleanEvent || event.endsWith('.$key')) {
                final parsedData = data is String ? (jsonDecode(data) as Map<String, dynamic>) : (data as Map<String, dynamic>? ?? {});
                for (final cb in map[key]!) {
                  cb(parsedData);
                }
              }
            }
          }
      }
    } catch (_) {}
  }

  void _onError(dynamic error) {
    _isConnected = false;
    _scheduleReconnect();
  }

  void _onDone() {
    _isConnected = false;
    _pingTimer?.cancel();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= 5) return; // توقف بعد 5 محاولات فاشلة
    final delay = Duration(seconds: 2 * (++_reconnectAttempts));
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, connect);
  }

  /// إرسال طلب authentication للـ private channel ثم الاشتراك
  Future<void> _subscribePrivate(String channel) async {
    if (_socketId == null) return;

    try {
      // 1. طلب auth token من الـ Laravel backend
      final authData = await ApiService.authenticateBroadcastChannel(
        channel: channel,
        socketId: _socketId!,
        authEndpoint: _authEndpoint,
      );
      final authSignature = authData['auth'] as String?;
      if (authSignature == null) return;

      // 2. أرسل طلب الاشتراك بـ signature
      _sendRaw({
        'event': 'pusher:subscribe',
        'data': {
          'channel': channel,
          'auth': authSignature,
        },
      });
    } catch (_) {}
  }

  /// الاشتراك في public channel (بدون auth)
  void _subscribePublic(String channel) {
    _sendRaw({
      'event': 'pusher:subscribe',
      'data': {'channel': channel},
    });
  }

  void _sendRaw(Map<String, dynamic> msg) {
    if (_socket == null || _socket!.readyState != WebSocket.open) return;
    _socket!.add(jsonEncode(msg));
  }
}
