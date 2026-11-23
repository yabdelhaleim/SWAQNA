// lib/screens/notifications/notifications_screen.dart
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../orders/order_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.getNotifications();
      if (!mounted) return;
      setState(() {
        _unreadCount = res['unread_count'] as int? ?? 0;
        _notifications = (res['data'] as List?) ?? [];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiService.markAllNotificationsAsRead();
      if (!mounted) return;
      setState(() {
        _unreadCount = 0;
        for (var n in _notifications) {
          n['is_read'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تم تعليم جميع الإشعارات كمقروءة ✅',
            style: TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppTheme.primary,
        ),
      );
    } catch (_) {}
  }

  void _onNotificationTapped(Map<String, dynamic> item) {
    final id = item['id']?.toString();
    if (id != null && item['is_read'] != true) {
      ApiService.markNotificationAsRead(id);
      setState(() {
        item['is_read'] = true;
        if (_unreadCount > 0) _unreadCount--;
      });
    }

    final orderId = item['order_id'];
    if (orderId != null && orderId.toString().isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OrderDetailScreen(orderId: orderId),
        ),
      );
    }
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'الآن';
      if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
      if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(_unreadCount > 0 ? 'الإشعارات ($_unreadCount)' : 'الإشعارات 🔔'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppTheme.textLight),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton.icon(
              onPressed: _markAllRead,
              icon: const Icon(Icons.done_all, size: 16, color: AppTheme.primaryYellow),
              label: const Text(
                'قراءة الكل',
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
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryYellow),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.notifications_off_outlined, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontFamily: 'Cairo', color: Colors.white70),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadNotifications,
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      );
    }

    if (_notifications.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white12),
                ),
                child: const Center(
                  child: Text('🔔', style: TextStyle(fontSize: 44)),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'مافيش إشعارات جديدة حالياً',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'هنا هتلاقي كل تحديثات طلباتك لحظة بلحظة وعروض الشيفات الحصرية أول بأول!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white60,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      color: AppTheme.primaryYellow,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = _notifications[index] as Map<String, dynamic>;
          final isRead = item['is_read'] == true;
          final icon = item['icon'] ?? '🔔';
          final title = item['title'] ?? 'إشعار';
          final body = item['body'] ?? '';
          final time = _formatTime(item['created_at']);
          final hasOrder = item['order_id'] != null;

          return GestureDetector(
            onTap: () => _onNotificationTapped(item),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isRead ? AppTheme.surface : AppTheme.surface.withAlpha(240),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isRead ? Colors.white10 : AppTheme.primaryYellow.withAlpha(100),
                  width: isRead ? 1.0 : 1.5,
                ),
                boxShadow: isRead
                    ? null
                    : [
                        BoxShadow(
                          color: AppTheme.primaryYellow.withAlpha(20),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: isRead
                          ? Colors.white.withAlpha(15)
                          : AppTheme.primaryYellow.withAlpha(35),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(icon, style: const TextStyle(fontSize: 20)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  color: isRead ? Colors.white70 : AppTheme.textLight,
                                  fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            if (!isRead)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.primaryYellow,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            body,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              color: Colors.white60,
                              fontSize: 12,
                              height: 1.3,
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              time,
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                color: Colors.white38,
                                fontSize: 11,
                              ),
                            ),
                            if (hasOrder)
                              const Row(
                                children: [
                                  Text(
                                    'عرض الطلب',
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      color: AppTheme.primaryYellow,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(width: 2),
                                  Icon(
                                    Icons.arrow_forward_ios,
                                    size: 10,
                                    color: AppTheme.primaryYellow,
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
