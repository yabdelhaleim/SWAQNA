// lib/providers/cart_provider.dart
import 'package:flutter/foundation.dart';
import '../models/cart_item_model.dart';

class CartProvider extends ChangeNotifier {
  final List<CartItemModel> _items = [];
  String? _currentStoreId;
  String? _currentStoreName;

  List<CartItemModel> get items => _items;
  String? get currentStoreId => _currentStoreId;
  String? get currentStoreName => _currentStoreName;
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  double get total => _items.fold(0.0, (sum, item) => sum + item.subtotal);

  bool get isEmpty => _items.isEmpty;

  void addItem(CartItemModel newItem) {
    // لو من متجر تاني امسح السلة القديمة
    if (_currentStoreId != null && _currentStoreId != newItem.storeId) {
      _items.clear();
    }
    _currentStoreId = newItem.storeId;
    _currentStoreName = newItem.storeName;

    // البحث بالمفتاح الفريد للتخصيص (cartKey)
    final existingIndex = _items.indexWhere((i) => i.cartKey == newItem.cartKey);
    if (existingIndex >= 0) {
      _items[existingIndex].quantity += newItem.quantity;
    } else {
      _items.add(newItem);
    }
    notifyListeners();
  }

  void removeItem(String keyOrId) {
    _items.removeWhere((i) => i.cartKey == keyOrId || i.dishId == keyOrId);
    if (_items.isEmpty) {
      _currentStoreId = null;
      _currentStoreName = null;
    }
    notifyListeners();
  }

  void increaseQuantity(String keyOrId) {
    final itemIndex = _items.indexWhere((i) => i.cartKey == keyOrId || i.dishId == keyOrId);
    if (itemIndex >= 0) {
      _items[itemIndex].quantity++;
      notifyListeners();
    }
  }

  void decreaseQuantity(String keyOrId) {
    final itemIndex = _items.indexWhere((i) => i.cartKey == keyOrId || i.dishId == keyOrId);
    if (itemIndex >= 0) {
      if (_items[itemIndex].quantity > 1) {
        _items[itemIndex].quantity--;
      } else {
        _items.removeAt(itemIndex);
        if (_items.isEmpty) {
          _currentStoreId = null;
          _currentStoreName = null;
        }
      }
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    _currentStoreId = null;
    _currentStoreName = null;
    notifyListeners();
  }

  List<Map<String, dynamic>> toOrderItems() =>
      _items.map((i) => i.toOrderItem()).toList();
}
