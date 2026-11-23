// lib/screens/orders/order_detail_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/cart_item_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../services/websocket_service.dart';
import '../../theme/app_theme.dart';
import '../cart/cart_screen.dart';
import 'order_review_sheet.dart';

class OrderDetailScreen extends StatefulWidget {
  final dynamic orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _isLoading = true;

  // WebSocket — الاستماع لحالة الطلب لحظيًا
  final _ws = ReverbWebSocket();

  // Polling احتياطي فقط كل 30 ثانية (بدلاً من 6 ثواني)
  Timer? _fallbackTimer;
  Timer? _etaTickerTimer;

  // للأنيمايشن عند تحديث الحالة
  bool _statusUpdated = false;

  @override
  void initState() {
    super.initState();
    _load().then((_) => _connectWebSocket());

    // مؤقت تحديث الـ ETA كل 10 ثواني
    _etaTickerTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) setState(() {});
    });

    // نبض احتياطي كل 30 ثانية فقط لو الـ WS انقطع
    _fallbackTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      final status = _order?['status']?.toString().toLowerCase();
      if (status != 'delivered' && status != 'cancelled' && status != 'rejected') {
        _loadSilent();
      } else {
        _fallbackTimer?.cancel();
      }
    });
  }

  void _connectWebSocket() {
    final orderId = widget.orderId.toString();
    final channelName = 'order.$orderId';

    // 1. تأكد من الاتصال
    _ws.connect();

    // 2. استمع لتحديثات الحالة (OrderStatusUpdated)
    _ws.listenPrivate(
      channelName: channelName,
      eventName: 'OrderStatusUpdated',
      callback: (data) {
        if (!mounted) return;
        final newStatus = data['status']?.toString() ?? '';
        if (newStatus.isNotEmpty) {
          setState(() {
            _order = {...?_order, 'status': newStatus.toLowerCase()};
            _statusUpdated = true;
          });
          // بعد نصف ثانية، أطفئ أنيمايشن التحديث
          Future.delayed(const Duration(milliseconds: 600), () {
            if (mounted) setState(() => _statusUpdated = false);
          });
          // لو الطلب وصل أو اتلغى، وقّف الـ fallback
          if (newStatus == 'DELIVERED' || newStatus == 'CANCELLED' || newStatus == 'REJECTED') {
            _fallbackTimer?.cancel();
          }
        }
      },
    );

    // 3. استمع لإلغاء الطلب (OrderCancelled)
    _ws.listenPrivate(
      channelName: channelName,
      eventName: 'OrderCancelled',
      callback: (data) {
        if (!mounted) return;
        setState(() {
          _order = {...?_order, 'status': 'cancelled'};
          _statusUpdated = true;
        });
        _fallbackTimer?.cancel();
        Future.delayed(const Duration(milliseconds: 600), () {
          if (mounted) setState(() => _statusUpdated = false);
        });
      },
    );
  }

  @override
  void dispose() {
    _fallbackTimer?.cancel();
    _etaTickerTimer?.cancel();
    // ترك الـ WebSocket connection مفتوح للصفحات الأخرى (singleton)
    // لكن نلغي اشتراك هذه القناة تحديدًا
    _ws.leaveChannel('order.${widget.orderId}');
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _isLoading = true);
    await _loadSilent();
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _loadSilent() async {
    try {
      final order = await ApiService.getOrderDetails(widget.orderId);
      final data = order['data'] ?? order;
      if (mounted && (data as Map).isNotEmpty) {
        setState(() => _order = Map<String, dynamic>.from(data));
      }
    } catch (_) {}
  }

  String _statusAr(String status) {
    const map = {
      'pending':   'بينتظر التأكيد ⏳',
      'confirmed': 'اتأكد وبدأ التجهيز ✅',
      'preparing': 'بيتجهز في المطبخ 👨‍🍳',
      'ready':     'جاهز وفي الطريق للتسليم 📦',
      'delivered': 'وصل واستلمت بألف هنا! 🎉',
      'cancelled': 'تم إلغاء الطلب ❌',
      'rejected':  'تم رفض الطلب 🚫',
    };
    return map[status.toLowerCase()] ?? status;
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':   return Colors.orange;
      case 'preparing': return const Color(0xFF2ED8A7);
      case 'ready':     return Colors.blue;
      case 'delivered': return AppTheme.primaryYellow;
      case 'cancelled':
      case 'rejected':  return Colors.redAccent;
      default:          return Colors.white54;
    }
  }

  final _steps = ['pending', 'preparing', 'ready', 'delivered'];

  @override
  Widget build(BuildContext context) {
    final status = _order?['status']?.toString().toLowerCase() ?? 'pending';
    final isActive = status != 'delivered' && status != 'cancelled' && status != 'rejected';

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: Text(
          'طلب #${_order?['order_code'] ?? widget.orderId.toString().substring(0, 8)}',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppTheme.textLight),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textLight),
            onPressed: _load,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryYellow))
          : _order == null
              ? const Center(
                  child: Text('تعذر تحميل الطلب',
                      style: TextStyle(color: AppTheme.textGrey, fontFamily: 'Cairo')))
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.primaryYellow,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [

                        // ═══ كارت الحالة المباشرة ════════════════════════════
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeOut,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: _statusUpdated
                                ? _statusColor(status).withAlpha(40)
                                : AppTheme.surface,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _statusUpdated
                                  ? _statusColor(status).withAlpha(130)
                                  : Colors.white10,
                              width: _statusUpdated ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            children: [
                              // مؤشر Live
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (isActive) ...[
                                    _LiveDot(color: _statusColor(status)),
                                    const SizedBox(width: 8),
                                  ],
                                  Flexible(
                                    child: Text(
                                      _statusAr(status),
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: _statusColor(status),
                                        fontFamily: 'Cairo',
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              // WebSocket badge
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    _ws.isConnected ? Icons.wifi : Icons.wifi_off,
                                    size: 11,
                                    color: _ws.isConnected
                                        ? const Color(0xFF2ED8A7)
                                        : Colors.white30,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    _ws.isConnected
                                        ? 'مباشر عبر WebSocket ⚡'
                                        : 'تحديث تلقائي كل 30 ث',
                                    style: const TextStyle(
                                      color: Colors.white38,
                                      fontSize: 10,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),

                              // شريط تقدم المراحل
                              if (status != 'cancelled' && status != 'rejected')
                                Row(
                                  children: _steps.map((step) {
                                    final currentIdx = _steps.indexOf(status);
                                    final stepIdx = _steps.indexOf(step);
                                    final isDone = stepIdx <= (currentIdx >= 0 ? currentIdx : 0);
                                    return Expanded(
                                      child: Column(
                                        children: [
                                          AnimatedContainer(
                                            duration: const Duration(milliseconds: 300),
                                            height: 5,
                                            color: isDone
                                                ? _statusColor(status)
                                                : Colors.white12,
                                            margin: const EdgeInsets.symmetric(horizontal: 2),
                                          ),
                                          const SizedBox(height: 6),
                                          Icon(
                                            isDone
                                                ? Icons.check_circle
                                                : Icons.radio_button_unchecked,
                                            color: isDone ? _statusColor(status) : Colors.white30,
                                            size: 16,
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // ═══ كارت العد التنازلي التقديري (ETA) ══════════════
                        if (status == 'preparing' || status == 'ready' || status == 'out_for_delivery') ...[
                          _buildEtaCard(status),
                          const SizedBox(height: 16),
                        ],

                        // ═══ كارت كود تسليم الطلب (4-Digit Delivery PIN) ═════
                        if (isActive) ...[
                          _buildDeliveryPinCard(status),
                          const SizedBox(height: 16),
                        ],

                        // ═══ المتجر مع زر الاتصال ═════════════════════════════
                        if (_order!['store'] != null)
                          _buildStoreCard(),

                        const SizedBox(height: 12),

                        // ═══ الأصناف ══════════════════════════════════════════
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'الأصناف المطلوبة 🍽️',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  color: AppTheme.textLight,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ...(_order!['items'] ?? []).map<Widget>((item) {
                                final dish = item['dish'] ?? {};
                                final variantName = item['variant_name'];
                                final notes = item['notes'];
                                final modifiers = (item['modifiers'] as List?) ?? [];

                                return Padding(
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
                                              '${dish['name'] ?? item['name'] ?? 'صنف'} × ${item['quantity']}',
                                              style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                color: Colors.white,
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            if (variantName != null && variantName.toString().isNotEmpty)
                                              Text(
                                                variantName.toString(),
                                                style: const TextStyle(
                                                  fontFamily: 'Cairo',
                                                  color: AppTheme.primaryYellow,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            if (modifiers.isNotEmpty)
                                              Text(
                                                modifiers.map((m) => '+ ${m['name']}').join(' • '),
                                                style: const TextStyle(
                                                  fontFamily: 'Cairo',
                                                  color: Color(0xFF2ED8A7),
                                                  fontSize: 11,
                                                ),
                                              ),
                                            if (notes != null && notes.toString().isNotEmpty)
                                              Text(
                                                'ملاحظة: $notes',
                                                style: const TextStyle(
                                                  fontFamily: 'Cairo',
                                                  color: Colors.white54,
                                                  fontSize: 11,
                                                  fontStyle: FontStyle.italic,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '${item['subtotal'] ?? item['total_price'] ?? 0} ج',
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          color: AppTheme.textLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                              const Divider(color: Colors.white12, height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'الإجمالي شامل التوصيل',
                                    style: TextStyle(
                                        fontFamily: 'Cairo',
                                        color: AppTheme.textLight,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    '${_order!['total_amount'] ?? _order!['total'] ?? 0} جنيه',
                                    style: const TextStyle(
                                      fontFamily: 'Cairo',
                                      color: AppTheme.primaryYellow,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 12),

                        // ═══ العنوان ══════════════════════════════════════════
                        if (_order!['delivery_address'] != null)
                          _InfoCard(
                            icon: Icons.location_on,
                            text: _order!['delivery_address'],
                            crossAlignment: CrossAxisAlignment.start,
                          ),

                        // ═══ قسم التقييم (DELIVERED فقط) ════════════════════
                        if (status == 'delivered' || status == 'completed') ...[
                          const SizedBox(height: 16),
                          _buildReviewSection(),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryYellow,
                                foregroundColor: AppTheme.background,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              icon: const Icon(Icons.replay_rounded, size: 20),
                              label: const Text(
                                'إعادة الطلب بنفس الأصناف 🔄',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              onPressed: _reorder,
                            ),
                          ),
                        ],

                        // ═══ زر الإلغاء (PENDING فقط) ════════════════════════
                        if (status == 'pending') ...[
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.redAccent,
                                side: const BorderSide(color: Colors.redAccent),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(Icons.cancel_outlined),
                              label: const Text(
                                'إلغاء الطلب',
                                style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15),
                              ),
                              onPressed: _confirmCancelOrder,
                            ),
                          ),
                        ],

                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
    );
  }

  void _reorder() {
    if (_order == null) return;
    final cart = context.read<CartProvider>();
    final store = _order!['store'];
    final storeId = (store?['id'] ?? _order!['store_id'] ?? '').toString();
    final storeName = (store?['name'] ?? 'متجر').toString();
    final items = (_order!['items'] as List<dynamic>?) ?? [];

    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('لا توجد أصناف في هذا الطلب لإعادة طلبها',
              style: TextStyle(fontFamily: 'Cairo')),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    for (final item in items) {
      final dish = item['dish'] ?? {};
      final dishId = (dish['id'] ?? item['dish_id'] ?? '').toString();
      final dishName = (dish['name'] ?? item['dish_name'] ?? item['name'] ?? 'صنف').toString();
      final price = (item['unit_price'] ?? item['price'] ?? dish['price'] ?? 0.0) is num
          ? (item['unit_price'] ?? item['price'] ?? dish['price'] ?? 0.0).toDouble()
          : double.tryParse((item['unit_price'] ?? item['price'] ?? dish['price'] ?? 0).toString()) ?? 0.0;
      final qty = (item['quantity'] ?? 1) is int ? item['quantity'] : int.tryParse(item['quantity'].toString()) ?? 1;

      cart.addItem(
        CartItemModel(
          dishId: dishId.isNotEmpty ? dishId : 'item_${items.indexOf(item)}',
          dishName: dishName,
          price: price,
          storeId: storeId,
          storeName: storeName,
          quantity: qty,
        ),
      );
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تمت إضافة الأصناف إلى السلة بنجاح 🛒',
            style: TextStyle(fontFamily: 'Cairo')),
        backgroundColor: AppTheme.darkTeal,
        behavior: SnackBarBehavior.floating,
      ),
    );

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const CartScreen()),
    );
  }

  Future<void> _confirmCancelOrder() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('إلغاء الطلب',
            style: TextStyle(fontFamily: 'Cairo', color: AppTheme.textLight)),
        content: const Text(
          'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟',
          style: TextStyle(fontFamily: 'Cairo', color: Colors.white70),
        ),
        actions: [
          TextButton(
            child: const Text('تراجع',
                style: TextStyle(fontFamily: 'Cairo', color: Colors.white60)),
            onPressed: () => Navigator.pop(ctx, false),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('تأكيد الإلغاء',
                style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('جاري إلغاء الطلب...')));
      try {
        await ApiService.cancelOrder(widget.orderId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تم إلغاء الطلب بنجاح ❌')));
          setState(() => _order = {...?_order, 'status': 'cancelled'});
          _fallbackTimer?.cancel();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString())));
        }
      }
    }
  }

  void _openReviewSheet() {
    final storeName = _order?['store']?['name'] ?? 'المطعم';
    final existingReview = _order?['review'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => OrderReviewSheet(
        orderId: widget.orderId.toString(),
        storeName: storeName,
        existingReview: existingReview,
        onReviewSubmitted: () {
          _load();
        },
      ),
    );
  }

  Widget _buildReviewSection() {
    final review = _order?['review'];
    if (review != null) {
      final rating = (review['rating'] as num?)?.toInt() ?? 5;
      final comment = review['comment']?.toString();
      final tags = review['tags'] as List?;

      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.primaryYellow.withAlpha(80), width: 1.2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Text(
                      'تقييمك للطلب:',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: AppTheme.textLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ...List.generate(5, (i) => Icon(
                      i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppTheme.primaryYellow,
                      size: 20,
                    )),
                  ],
                ),
                TextButton(
                  onPressed: _openReviewSheet,
                  child: const Text(
                    'تعديل ✏️',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: AppTheme.primaryYellow,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (tags != null && tags.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: tags.map((t) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryYellow.withAlpha(25),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primaryYellow.withAlpha(60)),
                  ),
                  child: Text(
                    t.toString(),
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      color: AppTheme.primaryYellow,
                      fontSize: 11,
                    ),
                  ),
                )).toList(),
              ),
            ],
            if (comment != null && comment.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '"$comment"',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white70,
                  fontSize: 13,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.primaryYellow),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryYellow.withAlpha(25),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            'الأكل وصل؟ ألف هنا وشفا! 😋',
            style: TextStyle(
              fontFamily: 'Cairo',
              color: AppTheme.textLight,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'قيّم تجربتك مع المطعم والشيف لمساعدة باقي الأكيلة',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Cairo',
              color: Colors.white60,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: _openReviewSheet,
            icon: const Icon(Icons.star_rounded, color: Colors.black),
            label: const Text(
              'تقييم الطلب الآن ⭐',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: Colors.black,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryYellow,
              minimumSize: const Size.fromHeight(46),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── كارت العد التنازلي المباشر (Live ETA Timer) ──────────────────────────
  Widget _buildEtaCard(String status) {
    final acceptedAtStr = _order?['accepted_at'] ?? _order?['created_at'];
    final prepMinutes = (_order?['prep_time_minutes'] as num?)?.toInt() ?? 45;

    int remainingMinutes = prepMinutes;
    double progress = 0.3;
    String statusTitle = 'جاري تحضير الوجبة في المطبخ 👨‍🍳🔥';
    String etaDisplay = '~ $prepMinutes دقيقة';

    if (status == 'ready') {
      statusTitle = 'الوجبة جاهزة وبانتظار مندوب التوصيل! 🛵';
      etaDisplay = 'جاهز الآن! ✨';
      progress = 0.85;
    } else if (status == 'out_for_delivery') {
      statusTitle = 'مندوب التوصيل في طريقه إليك الآن! 🚀';
      etaDisplay = 'خلال دقائق معدودة 🏁';
      progress = 0.95;
    } else if (acceptedAtStr != null) {
      final acceptedAt = DateTime.tryParse(acceptedAtStr.toString());
      if (acceptedAt != null) {
        final elapsed = DateTime.now().difference(acceptedAt).inMinutes;
        remainingMinutes = (prepMinutes - elapsed).clamp(1, prepMinutes);
        progress = (elapsed / prepMinutes).clamp(0.1, 0.8);
        etaDisplay = '~ $remainingMinutes دقيقة';
      }
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF16191D),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primaryYellow.withAlpha(90), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryYellow.withAlpha(20),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryYellow.withAlpha(35),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.timer_outlined, color: AppTheme.primaryYellow, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'الوقت التقديري المتبقي',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      etaDisplay,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        color: AppTheme.primaryYellow,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            statusTitle,
            style: const TextStyle(
              fontFamily: 'Cairo',
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryYellow),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  // ─── كارت كود تسليم الطلب (4-Digit Delivery PIN) ──────────────────────────
  Widget _buildDeliveryPinCard(String status) {
    final pin = _order?['delivery_pin']?.toString() ?? '1234';
    final digits = pin.padLeft(4, '0').split('').take(4).toList();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF13171A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white12, width: 1),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.security_rounded, color: AppTheme.primaryYellow, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'كود استلام الطلب (PIN)',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: AppTheme.textLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: pin));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('تم نسخ كود الاستلام: $pin 📋', style: const TextStyle(fontFamily: 'Cairo')),
                      behavior: SnackBarBehavior.floating,
                      backgroundColor: const Color(0xFF1E2124),
                    ),
                  );
                },
                child: Row(
                  children: [
                    Text(
                      'نسخ',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: AppTheme.primaryYellow.withAlpha(200),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.copy_rounded, color: AppTheme.primaryYellow.withAlpha(200), size: 14),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // الـ 4 خانات
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: digits.map((d) => Container(
              margin: const EdgeInsets.symmetric(horizontal: 6),
              width: 46,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFF1E2228),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryYellow.withAlpha(150), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryYellow.withAlpha(25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(
                d,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.primaryYellow,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 10),
          const Text(
            'أعطِ هذا الكود لمندوب التوصيل عند استلام الوجبة لتأكيد التسليم 🔒',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Cairo',
              color: Colors.white54,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  // ─── كارت المتجر مع زر الاتصال المباشر ──────────────────────────────────────
  Widget _buildStoreCard() {
    final store = _order?['store'] as Map<String, dynamic>? ?? {};
    final storeName = store['name']?.toString() ?? 'متجر سوقنا';
    final storePhone = store['phone']?.toString() ?? '01000000000';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primaryYellow.withAlpha(30),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.storefront_rounded, color: AppTheme.primaryYellow, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  storeName,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.textLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  storePhone,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    color: Colors.white54,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: () => _callStore(storePhone),
            icon: const Icon(Icons.phone_rounded, size: 16, color: Colors.black),
            label: const Text(
              'اتصال',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: Colors.black,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryYellow,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _callStore(String phone) async {
    final cleanPhone = phone.replaceAll(' ', '');
    final uri = Uri.parse('tel:$cleanPhone');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        await Clipboard.setData(ClipboardData(text: cleanPhone));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم نسخ رقم المطعم إلى الحافظة: $cleanPhone 📞', style: const TextStyle(fontFamily: 'Cairo')),
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFF1E2124),
            ),
          );
        }
      }
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: cleanPhone));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم نسخ رقم المطعم إلى الحافظة: $cleanPhone 📞', style: const TextStyle(fontFamily: 'Cairo')),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF1E2124),
          ),
        );
      }
    }
  }
}

// ─── Widgets مساعدة ──────────────────────────────────────────────────────────

class _LiveDot extends StatefulWidget {
  final Color color;
  const _LiveDot({required this.color});
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 1.0).animate(
        CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: _anim,
        child: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
        ),
      );
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String text;
  final CrossAxisAlignment crossAlignment;

  const _InfoCard({
    required this.icon,
    required this.text,
    this.crossAlignment = CrossAxisAlignment.center,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          crossAxisAlignment: crossAlignment,
          children: [
            Icon(icon, color: AppTheme.primaryYellow, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                    fontFamily: 'Cairo', color: AppTheme.textLight, fontSize: 14),
              ),
            ),
          ],
        ),
      );
}
