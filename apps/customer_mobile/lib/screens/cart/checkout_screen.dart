// lib/screens/cart/checkout_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/address_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../orders/order_success_screen.dart';
import '../profile/addresses_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _addressCtrl = TextEditingController();
  final _couponCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _isLoadingAddresses = true;
  bool _isValidatingCoupon = false;

  List<AddressModel> _savedAddresses = [];
  AddressModel? _selectedAddress;

  // كوبون الخصم
  String? _appliedCouponCode;
  double _discountAmount = 0.0;
  String? _couponDescription;

  String _selectedPaymentMethod = 'cash'; // 'cash' or 'instapay_vodafone'
  static const double _deliveryFee = 15.0;

  @override
  void initState() {
    super.initState();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    setState(() => _isLoadingAddresses = true);
    try {
      final list = await ApiService.getAddresses();
      if (!mounted) return;
      setState(() {
        _savedAddresses = list;
        _isLoadingAddresses = false;
        if (_savedAddresses.isNotEmpty) {
          final defaultAddr = _savedAddresses.firstWhere(
            (a) => a.isDefault,
            orElse: () => _savedAddresses.first,
          );
          _selectAddress(defaultAddr);
        }
      });
    } catch (_) {
      if (mounted) setState(() => _isLoadingAddresses = false);
    }
  }

  void _selectAddress(AddressModel addr) {
    setState(() {
      _selectedAddress = addr;
      _addressCtrl.text = addr.formattedAddress;
    });
  }

  void _openAddNewAddressSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddEditAddressSheet(
        onSaved: () {
          Navigator.pop(ctx);
          _fetchAddresses();
        },
      ),
    );
  }

  Future<void> _applyCoupon() async {
    final code = _couponCtrl.text.trim();
    if (code.isEmpty) return;

    final cart = context.read<CartProvider>();
    setState(() => _isValidatingCoupon = true);

    try {
      final res = await ApiService.validateCoupon(
        code: code,
        subtotal: cart.total,
        merchantId: cart.currentStoreId?.toString(),
      );

      if (!mounted) return;

      final data = res['data'];
      setState(() {
        _appliedCouponCode = data['code'];
        _discountAmount = double.tryParse(data['discount_amount'].toString()) ?? 0.0;
        _couponDescription = data['description'] ?? 'تم تطبيق الخصم';
        _couponCtrl.clear();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'مبروك! تم تطبيق الخصم (${_discountAmount.toStringAsFixed(0)} ج) 🎉',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppTheme.primary,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isValidatingCoupon = false);
    }
  }

  void _removeCoupon() {
    setState(() {
      _appliedCouponCode = null;
      _discountAmount = 0.0;
      _couponDescription = null;
    });
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final cart = context.read<CartProvider>();
    final address = _addressCtrl.text.trim();

    try {
      final res = await ApiService.placeOrder(
        merchantId: cart.currentStoreId!.toString(),
        items: cart.toOrderItems(),
        address: address,
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        couponCode: _appliedCouponCode,
      );

      if (!mounted) return;
      final orderId = res['data']?['id'] ?? res['id'];
      cart.clear();

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => OrderSuccessScreen(orderId: orderId),
        ),
        (route) => route.isFirst,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _couponCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final subtotal = cart.total;
    final finalTotal = (subtotal + _deliveryFee - _discountAmount).clamp(0.0, double.infinity);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('تأكيد الطلب والتوصيل 🚀'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppTheme.textLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 📋 ملخص الطلب
              _buildOrderSummaryCard(cart, subtotal, finalTotal),

              const SizedBox(height: 20),

              // 🎟️ قسم كود الخصم (Promo Code)
              _buildCouponSection(cart),

              const SizedBox(height: 20),

              // 📍 عنوان التوصيل ودفتر العناوين
              _buildAddressSection(),

              const SizedBox(height: 20),

              // 💳 طريقة الدفع
              _buildPaymentMethodSection(),

              const SizedBox(height: 20),

              // 📝 ملاحظات للمطعم والشيف
              const Text(
                '📝 ملاحظات للمطعم (اختياري)',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _notesCtrl,
                textDirection: TextDirection.rtl,
                maxLines: 2,
                style: const TextStyle(color: AppTheme.textLight, fontFamily: 'Cairo'),
                decoration: const InputDecoration(
                  hintText: 'مثلاً: رن الجرس ومترنش تليفون، الأكل يكون سخن جداً',
                ),
              ),

              const SizedBox(height: 32),

              // زر تأكيد وإرسال الطلب
              SizedBox(
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _placeOrder,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.black,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Icon(Icons.check_circle_outline, color: Colors.black),
                  label: Text(
                    _isLoading
                        ? 'جاري إرسال طلبك...'
                        : 'تأكيد وإرسال الطلب (${finalTotal.toStringAsFixed(0)} ج)',
                    style: const TextStyle(
                      color: Colors.black,
                      fontFamily: 'Cairo',
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryYellow,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderSummaryCard(CartProvider cart, double subtotal, double finalTotal) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'ملخص طلبك 📋',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                cart.currentStoreName ?? 'المتجر',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.primaryYellow,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...cart.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${item.dishName} × ${item.quantity}',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (item.variantName != null || item.modifiers.isNotEmpty)
                            Text(
                              [
                                if (item.variantName != null) item.variantName!,
                                ...item.modifiers.map((m) => m.name),
                              ].join(' • '),
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                color: Colors.white54,
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Text(
                      '${item.subtotal.toStringAsFixed(0)} ج',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        color: AppTheme.primaryYellow,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              )),
          const Divider(color: Colors.white12, height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'سعر الأصناف',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white60,
                  fontSize: 13,
                ),
              ),
              Text(
                '${subtotal.toStringAsFixed(0)} ج',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white70,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'رسوم التوصيل 🛵',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white60,
                  fontSize: 13,
                ),
              ),
              Text(
                '15 ج',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white70,
                ),
              ),
            ],
          ),
          if (_discountAmount > 0) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Text(
                      'خصم الكوبون 🎉',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.greenAccent,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.greenAccent.withAlpha(30),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _appliedCouponCode ?? '',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          color: Colors.greenAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  '- ${_discountAmount.toStringAsFixed(0)} ج',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    color: Colors.greenAccent,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
          const Divider(color: Colors.white12, height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'الإجمالي النهائي',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                '${finalTotal.toStringAsFixed(0)} جنيه',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.primaryYellow,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCouponSection(CartProvider cart) {
    if (_appliedCouponCode != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.greenAccent.withAlpha(20),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.greenAccent.withAlpha(80), width: 1.2),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.greenAccent, size: 24),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        _appliedCouponCode!,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          color: Colors.greenAccent,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '(وفرت ${_discountAmount.toStringAsFixed(0)} جنيه)',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  if (_couponDescription != null)
                    Text(
                      _couponDescription!,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.white60,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: _removeCoupon,
              icon: const Icon(Icons.close, color: Colors.redAccent, size: 20),
              tooltip: 'إلغاء الكوبون',
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.local_offer_outlined, color: AppTheme.primaryYellow, size: 18),
              SizedBox(width: 6),
              Text(
                'معاك كود خصم أو كوبون؟',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: TextField(
                    controller: _couponCtrl,
                    textCapitalization: TextCapitalization.characters,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      color: AppTheme.textLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                    decoration: InputDecoration(
                      hintText: 'ادخل الكوبون (مثلاً: SOUQNA30)',
                      hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.white38),
                      filled: true,
                      fillColor: AppTheme.background,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Colors.white12),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Colors.white12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.primaryYellow),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 46,
                child: ElevatedButton(
                  onPressed: _isValidatingCoupon ? null : _applyCoupon,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryYellow,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                  ),
                  child: _isValidatingCoupon
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Text(
                          'تطبيق',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAddressSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '📍 عنوان التوصيل',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: AppTheme.textLight,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
            if (_savedAddresses.isNotEmpty)
              TextButton.icon(
                onPressed: () async {
                  final picked = await Navigator.push<AddressModel>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AddressesScreen(selectMode: true),
                    ),
                  );
                  if (picked != null) {
                    _selectAddress(picked);
                  } else {
                    _fetchAddresses();
                  }
                },
                icon: const Icon(Icons.manage_history, size: 16, color: AppTheme.primaryYellow),
                label: const Text(
                  'إدارة العناوين',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.primaryYellow,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),

        // شرائح العناوين المحفوظة (Address Chips Carousel)
        if (_isLoadingAddresses)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryYellow),
              ),
            ),
          )
        else ...[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ..._savedAddresses.map((addr) {
                  final isSelected = _selectedAddress?.id == addr.id;
                  return GestureDetector(
                    onTap: () => _selectAddress(addr),
                    child: Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.primaryYellow.withAlpha(35)
                            : AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppTheme.primaryYellow : Colors.white12,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(addr.labelIcon, style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 6),
                          Text(
                            addr.title,
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              color: isSelected ? AppTheme.primaryYellow : Colors.white70,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                          if (addr.isDefault) ...[
                            const SizedBox(width: 4),
                            const Text('⭐', style: TextStyle(fontSize: 10)),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
                // زر إضافة عنوان جديد
                GestureDetector(
                  onTap: _openAddNewAddressSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.add, size: 16, color: AppTheme.primaryYellow),
                        SizedBox(width: 4),
                        Text(
                          'عنوان جديد +',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            color: AppTheme.primaryYellow,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // حقل تفاصيل العنوان (قابل للتعديل أو المراجعة)
        TextFormField(
          controller: _addressCtrl,
          textDirection: TextDirection.rtl,
          maxLines: 2,
          style: const TextStyle(color: AppTheme.textLight, fontFamily: 'Cairo', fontSize: 13),
          decoration: const InputDecoration(
            hintText: 'مثلاً: شارع النصر، المعادي، عمارة 15 الدور 4 شقة 12',
            prefixIcon: Icon(Icons.location_on, color: AppTheme.primaryYellow),
          ),
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'ادخل عنوان التوصيل';
            if (v.trim().length < 8) return 'العنوان مش واضح كفاية';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildPaymentMethodSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '💳 طريقة الدفع',
          style: TextStyle(
            fontFamily: 'Cairo',
            color: AppTheme.textLight,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedPaymentMethod = 'cash'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                  decoration: BoxDecoration(
                    color: _selectedPaymentMethod == 'cash'
                        ? AppTheme.primaryYellow.withAlpha(35)
                        : AppTheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _selectedPaymentMethod == 'cash'
                          ? AppTheme.primaryYellow
                          : Colors.white12,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.money,
                        color: _selectedPaymentMethod == 'cash'
                            ? AppTheme.primaryYellow
                            : Colors.white60,
                        size: 20,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'كاش عند الاستلام',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          color: _selectedPaymentMethod == 'cash'
                              ? AppTheme.primaryYellow
                              : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedPaymentMethod = 'instapay_vodafone'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                  decoration: BoxDecoration(
                    color: _selectedPaymentMethod == 'instapay_vodafone'
                        ? AppTheme.primaryYellow.withAlpha(35)
                        : AppTheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _selectedPaymentMethod == 'instapay_vodafone'
                          ? AppTheme.primaryYellow
                          : Colors.white12,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.phone_android,
                        color: _selectedPaymentMethod == 'instapay_vodafone'
                            ? AppTheme.primaryYellow
                            : Colors.white60,
                        size: 20,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'إنستاباي / محفظة',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          color: _selectedPaymentMethod == 'instapay_vodafone'
                              ? AppTheme.primaryYellow
                              : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
