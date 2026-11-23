// lib/screens/cart/cart_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../auth/phone_screen.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('السلة 🛒'),
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios, color: AppTheme.textLight),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        actions: [
          if (!cart.isEmpty)
            TextButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (_) => AlertDialog(
                    backgroundColor: AppTheme.surface,
                    title: const Text('تفضيل السلة؟',
                        style: TextStyle(
                            fontFamily: 'Cairo', color: AppTheme.textLight)),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('لا',
                              style: TextStyle(color: AppTheme.textGrey))),
                      ElevatedButton(
                        onPressed: () {
                          cart.clear();
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red),
                        child: const Text('اتفضل'),
                      ),
                    ],
                  ),
                );
              },
              child: const Text('فضّي السلة',
                  style: TextStyle(color: Colors.red, fontFamily: 'Cairo')),
            ),
        ],
      ),
      body: cart.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('🛒', style: TextStyle(fontSize: 64)),
                  SizedBox(height: 16),
                  Text(
                    'السلة فاضية!\nروح اختار أكل من الريلز 😋',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: AppTheme.textGrey,
                        fontSize: 18,
                        fontFamily: 'Cairo'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // اسم المتجر
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.storefront, color: AppTheme.primary),
                      const SizedBox(width: 10),
                      Text(
                        cart.currentStoreName ?? '',
                        style: const TextStyle(
                          color: AppTheme.textLight,
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
                // قائمة الأصناف
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: cart.items.length,
                    itemBuilder: (ctx, i) {
                      final item = cart.items[i];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.dishName,
                                    style: const TextStyle(
                                      color: AppTheme.textLight,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  // الحجم المختار
                                  if (item.variantName != null && item.variantName!.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryYellow.withAlpha(25),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        item.variantName!,
                                        style: const TextStyle(
                                          color: AppTheme.primaryYellow,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                    ),
                                  ],
                                  // الإضافات المختارة
                                  if (item.modifiers.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Wrap(
                                      spacing: 4,
                                      runSpacing: 2,
                                      children: item.modifiers.map((mod) => Text(
                                        '+ ${mod.name}',
                                        style: const TextStyle(
                                          color: Color(0xFF2ED8A7),
                                          fontSize: 11,
                                          fontFamily: 'Cairo',
                                        ),
                                      )).toList(),
                                    ),
                                  ],
                                  // ملاحظات خاصة
                                  if (item.specialInstructions != null && item.specialInstructions!.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.edit_note, size: 14, color: Colors.white54),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            item.specialInstructions!,
                                            style: const TextStyle(
                                              color: Colors.white54,
                                              fontSize: 11,
                                              fontStyle: FontStyle.italic,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 6),
                                  Text(
                                    '${item.price.toStringAsFixed(0)} ج × ${item.quantity}',
                                    style: const TextStyle(
                                      color: AppTheme.textGrey,
                                      fontFamily: 'Cairo',
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // العداد
                            Row(
                              children: [
                                IconButton(
                                  onPressed: () =>
                                      cart.decreaseQuantity(item.cartKey),
                                  icon: const Icon(Icons.remove_circle_outline,
                                      color: AppTheme.primaryYellow),
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: const TextStyle(
                                    color: AppTheme.textLight,
                                    fontFamily: 'Cairo',
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
                                  onPressed: () =>
                                      cart.increaseQuantity(item.cartKey),
                                  icon: const Icon(Icons.add_circle_outline,
                                      color: AppTheme.primaryYellow),
                                ),
                              ],
                            ),
                            // السعر الكلي
                            SizedBox(
                              width: 60,
                              child: Text(
                                '${item.subtotal.toStringAsFixed(0)} ج',
                                textAlign: TextAlign.end,
                                style: const TextStyle(
                                  color: AppTheme.primaryYellow,
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                // الإجمالي وزر الطلب
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'الإجمالي:',
                            style: TextStyle(
                              color: AppTheme.textLight,
                              fontFamily: 'Cairo',
                              fontSize: 18,
                            ),
                          ),
                          Text(
                            '${cart.total.toStringAsFixed(0)} جنيه',
                            style: const TextStyle(
                              color: AppTheme.gold,
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                              fontSize: 22,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final auth = context.read<AuthProvider>();
                            if (!auth.isAuthenticated) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'من فضلك سجل دخولك أولاً لإتمام طلبك 🛒',
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  backgroundColor: AppTheme.primaryOrange,
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => const PhoneScreen()),
                              );
                              return;
                            }
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const CheckoutScreen()),
                            );
                          },
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('تأكيد الطلب 🚀'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
