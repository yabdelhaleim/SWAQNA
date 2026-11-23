// lib/providers/auth_provider.dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

enum AuthState { initial, loading, otpSent, authenticated, error }

class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;

  AuthState _state = AuthState.initial;
  String? _token;
  String? _userName;
  String? _phone;
  String? _errorMessage;
  bool _isNewUser = false;

  AuthProvider(this._prefs) {
    _loadToken();
  }

  AuthState get state => _state;
  String? get token => _token;
  String? get userName => _userName;
  String? get phone => _phone;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null;
  bool get isNewUser => _isNewUser;

  void _loadToken() {
    _token = _prefs.getString('auth_token');
    _userName = _prefs.getString('user_name');
    if (_token != null) {
      ApiService.setToken(_token!);
      // 🔌 ابدأ الاتصال بـ WebSocket فور تحميل التوكن المحفوظ
      ReverbWebSocket().connect();
      _state = AuthState.authenticated;
    }
    notifyListeners();
  }

  Future<void> sendOtp(String phone) async {
    _state = AuthState.loading;
    _errorMessage = null;
    notifyListeners();
    try {
      final res = await ApiService.sendOtp(phone);
      _phone = phone;
      _isNewUser = res['is_new_user'] ?? false;
      _state = AuthState.otpSent;
    } catch (e) {
      _errorMessage = 'تعذر إرسال الكود. تحقق من رقمك.';
      _state = AuthState.error;
    }
    notifyListeners();
  }

  Future<bool> verifyOtp(String otp) async {
    _state = AuthState.loading;
    _errorMessage = null;
    notifyListeners();
    try {
      final res = await ApiService.verifyOtp(_phone!, otp);
      await _saveAuth(res);
      return true;
    } catch (e) {
      _errorMessage = 'كود غلط أو تعذر التحقق. جرب تاني.';
      _state = AuthState.error;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String name, String otp) async {
    _state = AuthState.loading;
    _errorMessage = null;
    notifyListeners();
    try {
      final res = await ApiService.register(
        name: name,
        phone: _phone!,
        otp: otp,
      );
      await _saveAuth(res);
      return true;
    } catch (e) {
      _errorMessage = 'حدث خطأ في التسجيل. جرب تاني.';
      _state = AuthState.error;
      notifyListeners();
      return false;
    }
  }

  Future<void> _saveAuth(Map<String, dynamic> res) async {
    _token = res['token'] ?? res['data']?['token'];
    _userName = res['user']?['name'] ?? res['data']?['user']?['name'] ?? 'عميل';
    if (_token != null) {
      await _prefs.setString('auth_token', _token!);
      await _prefs.setString('user_name', _userName!);
      ApiService.setToken(_token!);
      // 🔌 ابدأ الاتصال بـ WebSocket فور تسجيل الدخول
      ReverbWebSocket().connect();
      _state = AuthState.authenticated;
      notifyListeners();
    }
  }

  Future<void> updateUserName(String newName) async {
    _userName = newName;
    await _prefs.setString('user_name', newName);
    notifyListeners();
  }

  Future<void> logout() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('user_name');
    _token = null;
    _userName = null;
    _state = AuthState.initial;
    ApiService.clearToken();
    // 🔌 قطع الـ WebSocket عند تسجيل الخروج
    ReverbWebSocket().disconnect();
    notifyListeners();
  }
}
