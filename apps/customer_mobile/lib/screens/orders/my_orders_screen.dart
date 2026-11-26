// lib/screens/orders/my_orders_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/cart_item_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../cart/cart_screen.dart';
import 'order_detail_screen.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  List<dynamic> _orders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      _orders = await ApiService.getMyOrders();
    } catch (e) {
      _error = 'تعذر تحميل الطلبات';
    }
    if (mounted) setState(() => _isLoading = false);
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending': return Colors.orange;
      case 'confirmed': return Colors.blue;
      case 'preparing': return Colors.purple;
      case 'ready': return Colors.teal;
      case 'delivered': return Colors.green;
      case 'cancelled':
      case 'rejected': return Colors.red;
      default: return AppTheme.textGrey;
    }
  }

  String _statusAr(String status) {
    switch (status.toLowerCase()) {
      case 'pending': return 'بينتظر التأكيد';
      case 'confirmed': return 'اتأكد ✅';
      case 'preparing': return 'بيتجهز 👨‍🍳';
      case 'ready': return 'جاهز للتسليم 📦';
      case 'delivered': return 'وصل! 🎉';
      case 'cancelled': return 'اتلغى ❌';
      case 'rejected': return 'مرفوض ❌';
      default: return status;
    }
  }

  void _reorderOrder(Map<String, dynamic> order) async {
    List<dynamic> items = (order['items'] as List<dynamic>?) ?? [];
    if (items.isEmpty && order['id'] != null) {
      try {
        final details = await ApiService.getOrderDetails(order['id']);
        final data = details['data'] ?? details;
        if (data is Map && data['items'] is List) {
          items = data['items'];
        }
      } catch (_) {}
    }

    if (!mounted) return;
    if (items.isEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order['id'])),
      );
      return;
    }

    final cart = context.read<CartProvider>();
    final store = order['store'];
    final storeId = (store?['id'] ?? order['store_id'] ?? '').toString();
    final storeName = (store?['name'] ?? 'متجر').toString();

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('طلباتي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textLight),
            onPressed: _load,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppTheme.textGrey, size: 48),
                      const SizedBox(height: 12),
                      Text(_error!,
                          style: const TextStyle(
                              color: AppTheme.textGrey, fontFamily: 'Cairo')),
                      const SizedBox(height: 20),
                      ElevatedButton(
                          onPressed: _load, child: const Text('حاول تاني')),
                    ],
                  ),
                )
              : _orders.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('📭', style: TextStyle(fontSize: 64)),
                          SizedBox(height: 16),
                          Text(
                            'مفيش طلبات لحد دلوقتي!\nاطلب من الريلز 🍽️',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: AppTheme.textGrey,
                                fontSize: 17,
                                fontFamily: 'Cairo'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppTheme.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        itemBuilder: (ctx, i) {
                          final order = _orders[i];
                          final status = order['status'] ?? 'pending';
                          final total = order['total_amount'] ?? order['total'] ?? 0;
                          final id = order['id'];
                          final storeName = order['store']?['name'] ?? 'متجر';
                          final date = order['created_at']?.toString().substring(0, 10) ?? '';

                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => OrderDetailScreen(orderId: id),
                                ),
                              );
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(storeName,
                                            style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                color: AppTheme.textLight,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16)),
                                        const SizedBox(height: 4),
                                        Text('طلب #$id  •  $date',
                                            style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                color: AppTheme.textGrey,
                                                fontSize: 12)),
                                        const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                    horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: _statusColor(status)
                                                      .withAlpha(38),
                                                  borderRadius:
                                                      BorderRadius.circular(20),
                                                ),
                                                child: Text(
                                                  _statusAr(status),
                                                  style: TextStyle(
                                                    color: _statusColor(status),
                                                    fontFamily: 'Cairo',
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                              if (status == 'delivered') ...[
                                                const SizedBox(width: 8),
                                                InkWell(
                                                  onTap: () => _reorderOrder(order),
                                                  borderRadius: BorderRadius.circular(12),
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(
                                                        horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: AppTheme.primaryYellow.withAlpha(30),
                                                      borderRadius: BorderRadius.circular(12),
                                                      border: Border.all(color: AppTheme.primaryYellow.withAlpha(80)),
                                                    ),
                                                    child: const Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(Icons.replay_rounded, size: 12, color: AppTheme.primaryYellow),
                                                        SizedBox(width: 4),
                                                        Text(
                                                          'إعادة الطلب 🔄',
                                                          style: TextStyle(
                                                            color: AppTheme.primaryYellow,
                                                            fontFamily: 'Cairo',
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.bold,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                if (order['review'] != null)
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                        horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: AppTheme.primaryYellow.withAlpha(30),
                                                      borderRadius: BorderRadius.circular(12),
                                                    ),
                                                    child: Text(
                                                      '⭐ ${order['review']['rating']}/5',
                                                      style: const TextStyle(
                                                        color: AppTheme.primaryYellow,
                                                        fontFamily: 'Cairo',
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  )
                                                else
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                        horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: Colors.amber.withAlpha(30),
                                                      borderRadius: BorderRadius.circular(12),
                                                      border: Border.all(color: Colors.amber.withAlpha(80)),
                                                    ),
                                                    child: const Text(
                                                      'قيّم الآن ⭐',
                                                      style: TextStyle(
                                                        color: Colors.amber,
                                                        fontFamily: 'Cairo',
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                              ],
                                            ],
                                          ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '$total ج',
                                        style: const TextStyle(
                                          color: AppTheme.gold,
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.bold,
                                          fontSize: 18,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      const Icon(Icons.arrow_forward_ios,
                                          color: AppTheme.textGrey, size: 16),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
