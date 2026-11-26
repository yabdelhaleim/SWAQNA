// lib/screens/explore/explore_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/cart_item_model.dart';
import '../../models/reel_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../cart/cart_screen.dart';
import '../product/product_detail_sheet.dart';
import '../store/store_profile_sheet.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  bool _isLoading = true;
  bool _isSearching = false;
  String _selectedCategory = 'الكل';
  String _selectedSort = 'default';

  List<dynamic> _categories = [];
  List<dynamic> _merchants = [];
  List<dynamic> _trendingProducts = [];
  List<dynamic> _searchResults = [];
  List<String> _recentSearches = [];

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
    _loadExploreData();
  }

  Future<void> _loadRecentSearches() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('souqna_recent_searches') ?? [];
    if (mounted) setState(() => _recentSearches = list);
  }

  Future<void> _saveSearchQuery(String query) async {
    final q = query.trim();
    if (q.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    _recentSearches.remove(q);
    _recentSearches.insert(0, q);
    if (_recentSearches.length > 6) {
      _recentSearches = _recentSearches.sublist(0, 6);
    }
    await prefs.setStringList('souqna_recent_searches', _recentSearches);
    if (mounted) setState(() {});
  }

  Future<void> _loadExploreData() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getExploreData(
        category: _selectedCategory == 'الكل' ? null : _selectedCategory,
        sort: _selectedSort == 'default' ? null : _selectedSort,
      );
      if (mounted) {
        setState(() {
          _categories = data['categories'] ?? [];
          _merchants = data['featured_merchants'] ?? [];
          _trendingProducts = data['trending_products'] ?? [];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _performSearch(String query) async {
    final q = query.trim();
    if (q.isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults.clear();
      });
      return;
    }

    setState(() => _isSearching = true);
    try {
      final data = await ApiService.search(q);
      if (mounted) {
        setState(() {
          _searchResults = data['products'] ?? [];
        });
      }
    } catch (_) {}
  }

  void _onSearchSubmitted(String query) {
    _saveSearchQuery(query);
    _performSearch(query);
  }

  void _openStore(String storeId, String storeName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StoreProfileSheet(
        vendorId: storeId,
        vendorName: storeName,
      ),
    );
  }

  void _openProduct(dynamic p) {
    final reel = ReelModel(
      id: p['id'].toString(),
      videoUrl: '',
      thumbnailUrl: p['image_url'] ?? '',
      productId: p['id'].toString(),
      productTitle: p['name'] ?? 'وجبة',
      productDescription: p['description'] ?? '',
      price: double.tryParse(p['price'].toString()) ?? 100.0,
      category: _selectedCategory,
      vendorId: (p['store_id'] ?? '1').toString(),
      vendorName: p['store_name'] ?? 'متجر سوقنا',
      vendorAvatar: '',
      likesCount: 1500,
      commentsCount: 80,
      sharesCount: 30,
      savesCount: 200,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProductDetailSheet(reel: reel),
    );
  }

  void _addToCart(dynamic product) {
    context.read<CartProvider>().addItem(
          CartItemModel(
            dishId: product['id'].toString(),
            dishName: product['name'] ?? 'وجبة',
            price: double.tryParse(product['price'].toString()) ?? 100.0,
            storeId: (product['store_id'] ?? '1').toString(),
            storeName: product['store_name'] ?? 'متجر سوقنا',
          ),
        );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '✅ تمت إضافة "${product['name']}" للسلة',
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF2E7D32),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text(
          'اكتشف في سوقنا 🧭',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        actions: [
          Consumer<CartProvider>(
            builder: (context, cart, _) => Stack(
              children: [
                IconButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CartScreen()),
                    );
                  },
                  icon: const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                ),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryYellow,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadExploreData,
        color: AppTheme.primaryYellow,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // بار البحث الفوري
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white12),
                ),
                child: TextField(
                  controller: _searchCtrl,
                  textDirection: TextDirection.rtl,
                  style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                  decoration: InputDecoration(
                    hintText: 'ابحث عن أكلة، مطبخ، أو متجر...',
                    hintStyle: const TextStyle(color: Colors.white54, fontFamily: 'Cairo'),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.primaryYellow),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.white54),
                            onPressed: () {
                              _searchCtrl.clear();
                              _performSearch('');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  onChanged: _performSearch,
                  onSubmitted: _onSearchSubmitted,
                ),
              ),

              // عمليات البحث السابقة (Recent Searches)
              if (!_isSearching && _recentSearches.isNotEmpty) ...[
                const SizedBox(height: 12),
                SizedBox(
                  height: 32,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _recentSearches.length,
                    itemBuilder: (ctx, idx) {
                      final term = _recentSearches[idx];
                      return GestureDetector(
                        onTap: () {
                          _searchCtrl.text = term;
                          _performSearch(term);
                        },
                        child: Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white10,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.history, color: Colors.white54, size: 14),
                              const SizedBox(width: 4),
                              Text(
                                term,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // نتائج البحث لو العميل بيبحث
              if (_isSearching) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'نتائج البحث عن "${_searchCtrl.text}"',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    Text(
                      '${_searchResults.length} صنف',
                      style: const TextStyle(color: AppTheme.primaryYellow, fontFamily: 'Cairo'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (_searchResults.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 50),
                    child: Center(
                      child: Text(
                        'مفيش نتائج تطابق بحثك 🤔\nجرب تبحث بكلمة تانية',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white60, fontFamily: 'Cairo', fontSize: 16),
                      ),
                    ),
                  )
                else
                  _buildProductsGrid(_searchResults),
              ] else ...[
                // الأقسام والتصنيفات
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'الأقسام والأنواع 🍽️',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    if (_selectedCategory != 'الكل')
                      TextButton(
                        onPressed: () {
                          setState(() => _selectedCategory = 'الكل');
                          _loadExploreData();
                        },
                        child: const Text(
                          'عرض الكل',
                          style: TextStyle(color: AppTheme.primaryYellow, fontFamily: 'Cairo'),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 98,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (ctx, i) {
                      final cat = _categories[i];
                      final isSel = _selectedCategory == cat['title'];
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedCategory = isSel ? 'الكل' : cat['title'];
                          });
                          _loadExploreData();
                        },
                        child: Container(
                          width: 86,
                          margin: const EdgeInsets.only(left: 10),
                          decoration: BoxDecoration(
                            color: isSel ? AppTheme.primaryYellow : AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSel ? AppTheme.primaryYellow : Colors.white12,
                              width: isSel ? 2 : 1,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(22),
                                child: Image.network(
                                  cat['image'] ?? '',
                                  width: 44,
                                  height: 44,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.fastfood,
                                    color: Colors.white60,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                cat['title'] ?? '',
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                style: TextStyle(
                                  color: isSel ? Colors.black : Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // المتاجر والمطابخ المقترحة
                if (_merchants.isNotEmpty) ...[
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'أشهر المطابخ والمتاجر 👨‍🍳',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 120,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _merchants.length,
                      itemBuilder: (ctx, i) {
                        final m = _merchants[i];
                        return GestureDetector(
                          onTap: () => _openStore(m['id'].toString(), m['name'] ?? 'متجر'),
                          child: Container(
                            width: 220,
                            margin: const EdgeInsets.only(left: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 28,
                                  backgroundImage: NetworkImage(m['logo'] ?? ''),
                                  backgroundColor: Colors.white10,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        m['name'] ?? 'متجر',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          fontFamily: 'Cairo',
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.star, color: Colors.amber, size: 14),
                                          const SizedBox(width: 4),
                                          Text(
                                            '${m['rating'] ?? 4.8}',
                                            style: const TextStyle(
                                              color: Colors.white70,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      const Text(
                                        'تصفح المنيو 📖',
                                        style: TextStyle(
                                          color: Color(0xFF2ED8A7),
                                          fontSize: 11,
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.bold,
                                        ),
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
                  ),
                  const SizedBox(height: 24),
                ],

                // الأطباق الأكثر طلباً مع فلاتر الترتيب
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _selectedCategory == 'الكل'
                          ? 'الأطباق الأكثر طلباً 🔥'
                          : 'أطباق قسم $_selectedCategory 🔥',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    // فلتر الترتيب
                    PopupMenuButton<String>(
                      initialValue: _selectedSort,
                      icon: const Icon(Icons.sort, color: AppTheme.primaryYellow),
                      color: AppTheme.surface,
                      onSelected: (val) {
                        setState(() => _selectedSort = val);
                        _loadExploreData();
                      },
                      itemBuilder: (ctx) => [
                        const PopupMenuItem(
                          value: 'default',
                          child: Text('الأحدث تلقائياً', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
                        ),
                        const PopupMenuItem(
                          value: 'price_asc',
                          child: Text('الأقل سعراً 💵', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
                        ),
                        const PopupMenuItem(
                          value: 'price_desc',
                          child: Text('الأعلى سعراً 💎', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: CircularProgressIndicator(color: AppTheme.primaryYellow),
                    ),
                  )
                else if (_trendingProducts.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Text(
                        'لا توجد منتجات في هذا القسم حالياً',
                        style: TextStyle(color: Colors.white60, fontFamily: 'Cairo'),
                      ),
                    ),
                  )
                else
                  _buildProductsGrid(_trendingProducts),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductsGrid(List<dynamic> products) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.74,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemBuilder: (ctx, i) {
        final p = products[i];
        final price = p['price'] ?? 0;
        return GestureDetector(
          onTap: () => _openProduct(p),
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // صورة الوجبة
                Expanded(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                    child: Image.network(
                      p['image_url'] ?? '',
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Colors.white10,
                        child: const Center(
                          child: Icon(Icons.restaurant, color: Colors.white30, size: 36),
                        ),
                      ),
                    ),
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'] ?? 'صنف',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        p['store_name'] ?? 'متجر',
                        maxLines: 1,
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 11,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '$price ج',
                            style: const TextStyle(
                              color: AppTheme.primaryYellow,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Cairo',
                            ),
                          ),
                          // زر إضافة للسلة
                          InkWell(
                            onTap: () => _addToCart(p),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryYellow,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.add, color: Colors.black, size: 16),
                                  SizedBox(width: 2),
                                  Text(
                                    'اطلب',
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
    );
  }
}
