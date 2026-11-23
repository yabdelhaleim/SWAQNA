// lib/providers/reels_provider.dart
import 'package:flutter/foundation.dart';
import '../models/reel_model.dart';
import '../services/api_service.dart';

class ReelsProvider extends ChangeNotifier {
  final List<ReelModel> _reels = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _page = 1;
  int _lastPage = 1;
  String? _error;
  String _selectedCategory = 'الكل';

  List<ReelModel> get reels => _reels;
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;
  String? get error => _error;
  String get selectedCategory => _selectedCategory;

  Future<void> loadReels({bool refresh = false, String? category}) async {
    if (_isLoading) return;

    // لو اتغيّر التصنيف → refresh تلقائي
    if (category != null && category != _selectedCategory) {
      _selectedCategory = category;
      refresh = true;
    }

    if (refresh) {
      _page = 1;
      _lastPage = 1;
      _hasMore = true;
      _reels.clear();
      _error = null;
    }

    if (!_hasMore) return;

    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.getReelsPaginated(
        page: _page,
        category: _selectedCategory == 'الكل' ? null : _selectedCategory,
      );

      final data = result['data'] as List<dynamic>;
      _lastPage = result['last_page'] as int? ?? 1;

      if (data.isEmpty || _page >= _lastPage) {
        _hasMore = false;
      }

      if (data.isNotEmpty) {
        _reels.addAll(data.map((j) => ReelModel.fromJson(j)));
        _page++;
      }

      _error = null;
    } catch (e) {
      _error = 'تعذر تحميل الريلز. تحقق من الاتصال.';
    }

    _isLoading = false;
    notifyListeners();
  }

  void changeCategory(String category) {
    if (category == _selectedCategory) return;
    loadReels(category: category);
  }
}
