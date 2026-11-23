// lib/screens/product/product_detail_sheet.dart
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:provider/provider.dart';
import '../../models/cart_item_model.dart';
import '../../models/reel_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class ProductDetailSheet extends StatefulWidget {
  final ReelModel reel;

  const ProductDetailSheet({super.key, required this.reel});

  @override
  State<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<ProductDetailSheet> {
  bool _isLoading = false;
  List<dynamic> _variants = [];
  List<dynamic> _modifierGroups = [];

  // الاختيارات المحددة
  Map<String, dynamic>? _selectedVariant;
  final Map<String, SelectedModifier> _selectedModifiers = {};
  final TextEditingController _notesController = TextEditingController();
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    // 1. إذا كانت الريل محملة بالأحجام والمجموعات مسبقاً نستخدمها فوراً
    if (widget.reel.variants.isNotEmpty || widget.reel.modifierGroups.isNotEmpty) {
      _applyData(widget.reel.variants, widget.reel.modifierGroups);
      return;
    }

    // 2. إذا لم تكن محملة، نجلبها من API المنتج
    final prodId = widget.reel.productId;
    if (prodId.isNotEmpty && prodId != '1') {
      setState(() => _isLoading = true);
      try {
        final res = await ApiService.getProductDetails(prodId);
        final data = res['data'] ?? res;
        if (mounted && data is Map) {
          final vars = data['variants'] is List ? data['variants'] as List : [];
          final mods = data['modifier_groups'] is List ? data['modifier_groups'] as List : [];
          _applyData(vars, mods);
        }
      } catch (_) {}
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyData(List<dynamic> vars, List<dynamic> mods) {
    setState(() {
      _variants = vars;
      _modifierGroups = mods;
      // اختيار الحجم الأول تلقائياً كافتراضي
      if (_variants.isNotEmpty) {
        _selectedVariant = _variants.first as Map<String, dynamic>;
      }
      // اختيار الخيارات الإجبارية الافتراضية
      for (final g in _modifierGroups) {
        if (g is Map && g['is_required'] == true) {
          final items = g['items'] as List?;
          if (items != null && items.isNotEmpty) {
            final firstItem = items.first as Map<String, dynamic>;
            final modId = firstItem['id'].toString();
            _selectedModifiers[modId] = SelectedModifier(
              id: modId,
              name: firstItem['name'].toString(),
              price: double.tryParse(firstItem['additional_price']?.toString() ?? '0') ?? 0.0,
            );
          }
        }
      }
    });
  }

  /// حساب سعر الوحدة الحالية (الحجم + الإضافات)
  double get _currentUnitPrice {
    double base = _selectedVariant != null
        ? (double.tryParse(_selectedVariant!['price']?.toString() ?? '') ?? widget.reel.price)
        : widget.reel.price;

    double addOns = 0.0;
    for (final mod in _selectedModifiers.values) {
      addOns += mod.price;
    }
    return base + addOns;
  }

  double get _totalPrice => _currentUnitPrice * _quantity;

  void _toggleModifier(Map<String, dynamic> item, Map<String, dynamic> group) {
    final modId = item['id'].toString();
    final isRequired = group['is_required'] == true;
    final maxSel = (group['max_selection'] as int?) ?? 5;

    setState(() {
      // إذا كانت المجموعة خياراً فردياً (مثلاً درجة الشطة: اختيار واحد فقط)
      if (maxSel == 1 || isRequired) {
        // احذف أي اختيار سابق من نفس المجموعة
        final groupItems = (group['items'] as List?) ?? [];
        for (final gi in groupItems) {
          _selectedModifiers.remove(gi['id'].toString());
        }
        _selectedModifiers[modId] = SelectedModifier(
          id: modId,
          name: item['name'].toString(),
          price: double.tryParse(item['additional_price']?.toString() ?? '0') ?? 0.0,
        );
      } else {
        // مجموعة إضافات متعددة
        if (_selectedModifiers.containsKey(modId)) {
          _selectedModifiers.remove(modId);
        } else {
          _selectedModifiers[modId] = SelectedModifier(
            id: modId,
            name: item['name'].toString(),
            price: double.tryParse(item['additional_price']?.toString() ?? '0') ?? 0.0,
          );
        }
      }
    });
  }

  void _addToCart() {
    final cart = context.read<CartProvider>();

    final cartItem = CartItemModel(
      dishId: widget.reel.productId.isNotEmpty ? widget.reel.productId : widget.reel.id,
      dishName: widget.reel.productTitle,
      price: _currentUnitPrice,
      storeId: widget.reel.vendorId,
      storeName: widget.reel.vendorName,
      imageUrl: widget.reel.thumbnailUrl,
      variantId: _selectedVariant?['id']?.toString(),
      variantName: _selectedVariant?['name']?.toString(),
      modifiers: _selectedModifiers.values.toList(),
      specialInstructions: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
      quantity: _quantity,
    );

    cart.addItem(cartItem);

    Fluttertoast.showToast(
      msg: 'تمت إضافة الوجبة للسلة بنجاح 🛒',
      backgroundColor: const Color(0xFF2ED8A7),
      textColor: Colors.black,
      fontSize: 14.0,
      gravity: ToastGravity.BOTTOM,
    );

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final reel = widget.reel;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF101418),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // مقبض السحب للأعلى
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(10),
            ),
          ),

          // المحتوى التمريري
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryYellow))
                : SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // عنوان الوجبة والتقييم
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    reel.productTitle,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.storefront, color: AppTheme.primaryYellow, size: 14),
                                      const SizedBox(width: 4),
                                      Text(
                                        reel.vendorName,
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 12,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.amber.withAlpha(30),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.amber.withAlpha(80)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${reel.rating}',
                                    style: const TextStyle(
                                      color: Colors.amber,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // وصف الوجبة
                        if (reel.productDescription.isNotEmpty)
                          Text(
                            reel.productDescription,
                            style: const TextStyle(
                              color: Colors.white60,
                              fontSize: 13,
                              height: 1.5,
                              fontFamily: 'Cairo',
                            ),
                          ),

                        const SizedBox(height: 20),
                        const Divider(color: Colors.white12),

                        // ═══ قسم الأحجام (Variants / Sizes) ════════════════════
                        if (_variants.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'حجم الوجبة 🍽️',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryYellow.withAlpha(30),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'إجباري',
                                  style: TextStyle(
                                    color: AppTheme.primaryYellow,
                                    fontSize: 10,
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          ..._variants.map((v) {
                            final isSelected = _selectedVariant?['id'] == v['id'];
                            final price = double.tryParse(v['price']?.toString() ?? '') ?? 0.0;
                            return InkWell(
                              onTap: () => setState(() => _selectedVariant = v as Map<String, dynamic>),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppTheme.primaryYellow.withAlpha(20) : const Color(0xFF1A1F26),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? AppTheme.primaryYellow : Colors.white10,
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                      color: isSelected ? AppTheme.primaryYellow : Colors.white30,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        v['name'] ?? 'حجم',
                                        style: TextStyle(
                                          color: isSelected ? Colors.white : Colors.white70,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                          fontSize: 14,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '${price.toInt()} ج.م',
                                      style: TextStyle(
                                        color: isSelected ? AppTheme.primaryYellow : Colors.white60,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                          const SizedBox(height: 14),
                          const Divider(color: Colors.white12),
                        ],

                        // ═══ مجموعات الإضافات (Modifier Groups) ══════════════
                        ..._modifierGroups.map((group) {
                          final gName = group['name'] ?? 'إضافات';
                          final isRequired = group['is_required'] == true;
                          final items = (group['items'] as List?) ?? [];

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    gName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                  Text(
                                    isRequired ? 'اختيار واحد' : 'اختياري',
                                    style: TextStyle(
                                      color: isRequired ? Colors.orangeAccent : Colors.white38,
                                      fontSize: 11,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              ...items.map((item) {
                                final modId = item['id'].toString();
                                final isSelected = _selectedModifiers.containsKey(modId);
                                final addPrice = double.tryParse(item['additional_price']?.toString() ?? '0') ?? 0.0;

                                return InkWell(
                                  onTap: () => _toggleModifier(item as Map<String, dynamic>, group as Map<String, dynamic>),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF2ED8A7).withAlpha(20) : const Color(0xFF1A1F26),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isSelected ? const Color(0xFF2ED8A7) : Colors.white10,
                                        width: isSelected ? 1.5 : 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          isSelected ? Icons.check_box : Icons.check_box_outline_blank,
                                          color: isSelected ? const Color(0xFF2ED8A7) : Colors.white30,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            item['name'] ?? '',
                                            style: TextStyle(
                                              color: isSelected ? Colors.white : Colors.white70,
                                              fontSize: 13,
                                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                        ),
                                        Text(
                                          addPrice > 0 ? '+${addPrice.toInt()} ج.م' : 'مجاناً',
                                          style: TextStyle(
                                            color: addPrice > 0 ? const Color(0xFF2ED8A7) : Colors.white38,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            fontFamily: 'Cairo',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                              const SizedBox(height: 14),
                              const Divider(color: Colors.white12),
                            ],
                          );
                        }),

                        // ═══ ملاحظات خاصة للشيف ═════════════════════════════
                        const SizedBox(height: 8),
                        const Text(
                          'ملاحظات خاصة للشيف 📝',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _notesController,
                          maxLines: 2,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'Cairo'),
                          decoration: InputDecoration(
                            hintText: 'مثلاً: بدون بصل، تسوية زيادة، شطة خفيفة...',
                            hintStyle: const TextStyle(color: Colors.white30, fontSize: 12, fontFamily: 'Cairo'),
                            filled: true,
                            fillColor: const Color(0xFF1A1F26),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppTheme.primaryYellow, width: 1),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
          ),

          // ═══ الشريط السفلي العائم (Sticky Bottom Bar) ══════════════════════
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF161B22),
              border: Border(top: BorderSide(color: Colors.white.withAlpha(20))),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(100),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  // عداد الكمية (- 1 +)
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF222831),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove, color: Colors.white, size: 18),
                          onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                          constraints: const BoxConstraints(minWidth: 36, minHeight: 40),
                          padding: EdgeInsets.zero,
                        ),
                        Text(
                          '$_quantity',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add, color: AppTheme.primaryYellow, size: 18),
                          onPressed: () => setState(() => _quantity++),
                          constraints: const BoxConstraints(minWidth: 36, minHeight: 40),
                          padding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 14),

                  // زر إضافة للسلة مع إجمالي السعر التفاعلي
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryYellow,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      onPressed: _addToCart,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.shopping_bag_outlined, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'أضف للسلة',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            width: 4,
                            height: 4,
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${_totalPrice.toInt()} ج.م',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
