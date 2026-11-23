// lib/screens/orders/order_success_screen.dart
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'my_orders_screen.dart';

class OrderSuccessScreen extends StatelessWidget {
  final dynamic orderId;
  const OrderSuccessScreen({super.key, this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎉', style: TextStyle(fontSize: 80)),
              const SizedBox(height: 24),
              const Text(
                'طلبك اتبعت!',
                style: TextStyle(
                  color: AppTheme.textLight,
                  fontFamily: 'Cairo',
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              if (orderId != null)
                Text(
                  'رقم الطلب: #$orderId',
                  style: const TextStyle(
                    color: AppTheme.gold,
                    fontFamily: 'Cairo',
                    fontSize: 16,
                  ),
                ),
              const SizedBox(height: 8),
              const Text(
                'الطلب وصل للمتجر وبيتجهز دلوقتي 👨‍🍳',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textGrey,
                  fontFamily: 'Cairo',
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 40),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const MyOrdersScreen()),
                    (route) => route.isFirst,
                  );
                },
                icon: const Icon(Icons.receipt_long),
                label: const Text('تابع طلبك'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.popUntil(context, (route) => route.isFirst);
                },
                child: const Text(
                  'ارجع للريلز 🍽️',
                  style: TextStyle(color: AppTheme.primary, fontFamily: 'Cairo'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
