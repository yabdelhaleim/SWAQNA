// lib/models/cart_item_model.dart

class SelectedModifier {
  final String id;
  final String name;
  final double price;

  const SelectedModifier({
    required this.id,
    required this.name,
    required this.price,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'price': price,
      };
}

class CartItemModel {
  final String dishId;
  final String dishName;
  final double price; // السعر الإجمالي للوحدة (السعر الأساسي أو الحجم + مجموع الإضافات)
  final String storeId;
  final String storeName;
  final String? imageUrl;
  final String? variantId;
  final String? variantName;
  final List<SelectedModifier> modifiers;
  final String? specialInstructions;
  int quantity;

  CartItemModel({
    required this.dishId,
    required this.dishName,
    required this.price,
    required this.storeId,
    required this.storeName,
    this.imageUrl,
    this.variantId,
    this.variantName,
    this.modifiers = const [],
    this.specialInstructions,
    this.quantity = 1,
  });

  /// مفتاح فريد لتمييز الوجبة بتخصيصاتها في السلة
  String get cartKey {
    final modIds = modifiers.map((m) => m.id).toList()..sort();
    return '${dishId}_${variantId ?? "default"}_${modIds.join(",")}_${specialInstructions ?? ""}';
  }

  double get subtotal => price * quantity;

  Map<String, dynamic> toOrderItem() => {
        'dish_id': dishId,
        'quantity': quantity,
        if (variantId != null) 'variant_id': variantId,
        if (modifiers.isNotEmpty)
          'modifier_ids': modifiers.map((m) => m.id).toList(),
        if (specialInstructions != null && specialInstructions!.trim().isNotEmpty)
          'special_instructions': specialInstructions!.trim(),
      };
}
