// lib/screens/profile/support_sheet.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_theme.dart';

class SupportSheet extends StatelessWidget {
  const SupportSheet({super.key});

  static const String _whatsappNumber = '201000000000';
  static const String _hotline = '19999';

  Future<void> _openWhatsApp(BuildContext context) async {
    const text = 'مرحباً خدمة عملاء سوقنا، أحتاج إلى مساعدة بخصوص طلبي 🍽️';
    final url = Uri.parse('https://wa.me/$_whatsappNumber?text=${Uri.encodeComponent(text)}');

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else if (context.mounted) {
        await _copyToClipboard(context, '01000000000', 'رقم واتساب الدعم الفني');
      }
    } catch (_) {
      if (context.mounted) {
        await _copyToClipboard(context, '01000000000', 'رقم واتساب الدعم الفني');
      }
    }
  }

  Future<void> _callHotline(BuildContext context) async {
    final url = Uri.parse('tel:$_hotline');
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url);
      } else if (context.mounted) {
        await _copyToClipboard(context, _hotline, 'الخط الساخن');
      }
    } catch (_) {
      if (context.mounted) {
        await _copyToClipboard(context, _hotline, 'الخط الساخن');
      }
    }
  }

  Future<void> _copyToClipboard(BuildContext context, String text, String label) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تم نسخ $label إلى الحافظة: $text 📋',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: const Color(0xFF1E2124),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF111417),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryYellow.withAlpha(30),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: AppTheme.primaryYellow, size: 24),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'مركز المساعدة والدعم الفني 🎧',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'فريق سوقنا في خدمتك على مدار الساعة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.white10, height: 1),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // بطاقتي الاتصال السريع (واتساب + خط ساخن)
                  Row(
                    children: [
                      // واتساب
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _openWhatsApp(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1B3B2B),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFF25D366).withAlpha(80)),
                            ),
                            child: const Column(
                              children: [
                                Text('💬', style: TextStyle(fontSize: 28)),
                                SizedBox(height: 8),
                                Text(
                                  'محادثة واتساب',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  'رد فوري 24/7',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color: Color(0xFF25D366),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // الخط الساخن
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _callHotline(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF242217),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: AppTheme.primaryYellow.withAlpha(80)),
                            ),
                            child: const Column(
                              children: [
                                Text('📞', style: TextStyle(fontSize: 28)),
                                SizedBox(height: 8),
                                Text(
                                  'الخط الساخن',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  '19999 (بسعر الدقيقة)',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color: AppTheme.primaryYellow,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // الأسئلة الشائعة
                  const Text(
                    'الأسئلة الشائعة 🤔',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),

                  const _FaqTile(
                    question: 'كم يستغرق تجهيز وتوصيل الوجبة؟',
                    answer: 'يتم تجهيز الوجبات طازجة في مطابخ شركائنا وتستغرق عادةً بين 30 إلى 45 دقيقة. يمكنك متابعة وقت التحضير التقديري (ETA) وموقع الطلب لحظياً عبر التطبيق.',
                  ),
                  const _FaqTile(
                    question: 'ما هو كود استلام الطلب (PIN)؟',
                    answer: 'كود التسليم هو رمز أمان خاص مكون من 4 أرقام يظهر في تفاصيل طلبك بعد تأكيده. احرص على إعطائه لمندوب التوصيل فقط عند استلام الوجبة لتأكيد نجاح التسليم.',
                  ),
                  const _FaqTile(
                    question: 'ما هي طرق الدفع المتاحة في سوقنا؟',
                    answer: 'نوفر الدفع النقدي عند الاستلام (Cash on Delivery)، بالإضافة للتحويل المباشر عبر إنستاباي ومحافظ فودافون كاش.',
                  ),
                  const _FaqTile(
                    question: 'كيف أستخدم كود الخصم (الكوبون)؟',
                    answer: 'في شاشة الدفع (Checkout)، ستجد خانة مخصصة لكوبونات الخصم؛ اكتب الكود واضغط "تطبيق" ليتم خصم القيمة فورياً من إجمالي الحساب.',
                  ),
                  const _FaqTile(
                    question: 'هل يمكنني إلغاء الطلب بعد إرساله؟',
                    answer: 'نعم، يمكنك إلغاء الطلب مباشرة طالما أنه في حالة "قيد الانتظار" (Pending). بمجرد قبول المطعم وبدء التجهيز، يُرجى التواصل معنا عبر واتساب للمساعدة.',
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

class _FaqTile extends StatefulWidget {
  final String question;
  final String answer;

  const _FaqTile({required this.question, required this.answer});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _expanded ? AppTheme.primaryYellow.withAlpha(100) : Colors.white10,
        ),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: AppTheme.primaryYellow,
          collapsedIconColor: Colors.white54,
          title: Text(
            widget.question,
            style: const TextStyle(
              fontFamily: 'Cairo',
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          onExpansionChanged: (val) => setState(() => _expanded = val),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Text(
                widget.answer,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white70,
                  fontSize: 12,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
