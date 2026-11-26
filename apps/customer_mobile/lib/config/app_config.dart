// lib/config/app_config.dart

class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.swaqna.remotelly1.site/api/v1',
  );

  static const String mediaBaseUrl = String.fromEnvironment(
    'MEDIA_BASE_URL',
    defaultValue: 'https://api.swaqna.remotelly1.site',
  );

  static const String wsHost = String.fromEnvironment(
    'WS_HOST',
    defaultValue: 'ws.swaqna.remotelly1.site',
  );

  static const int wsPort = int.fromEnvironment(
    'WS_PORT',
    defaultValue: 443,
  );

  static const bool wsUseTls = bool.fromEnvironment(
    'WS_USE_TLS',
    defaultValue: true,
  );

  static const String reverbAppKey = String.fromEnvironment(
    'REVERB_APP_KEY',
    defaultValue: 'hnghnwywzmpxeg2kxdfr',
  );

  static String get wsScheme => wsUseTls ? 'wss' : 'ws';

  static String get broadcastingAuthUrl {
    final base = apiBaseUrl.endsWith('/v1')
        ? apiBaseUrl.substring(0, apiBaseUrl.length - 3)
        : apiBaseUrl;
    return '$base/broadcasting/auth';
  }
}
