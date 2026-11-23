// lib/models/reel_model.dart

class ReelModel {
  final String id;
  final String videoUrl;
  final String thumbnailUrl;
  
  // بيانات المنتج
  final String productId;
  final String productTitle;
  final String productDescription;
  final double price;
  final double? originalPrice; // السعر قبل الخصم
  final double rating;         // التقييم (مثلاً 4.8)
  final String category;       // أكل بيتي، مطاعم، طواجن
  final List<dynamic> variants;         // أحجام الوجبة من قاعدة البيانات
  final List<dynamic> modifierGroups;   // مجموعات الإضافات والصوصات

  // بيانات المتجر / البائع
  final String vendorId;
  final String vendorName;
  final String vendorAvatar;
  final bool isVerified;

  // إحصائيات وحالات التفاعل المباشرة
  int likesCount;
  final int commentsCount;
  final int sharesCount;
  int savesCount;
  bool isLiked;
  bool isSaved;

  ReelModel({
    required this.id,
    required this.videoUrl,
    required this.thumbnailUrl,
    required this.productId,
    required this.productTitle,
    required this.productDescription,
    required this.price,
    this.originalPrice,
    this.rating = 4.8,
    required this.category,
    this.variants = const [],
    this.modifierGroups = const [],
    required this.vendorId,
    required this.vendorName,
    required this.vendorAvatar,
    this.isVerified = true,
    required this.likesCount,
    required this.commentsCount,
    required this.sharesCount,
    required this.savesCount,
    this.isLiked = false,
    this.isSaved = false,
  });

  factory ReelModel.fromJson(Map<String, dynamic> json) {
    final product = json['dish'] ?? json['product'] ?? {};
    final vendor = json['store'] ?? json['vendor'] ?? {};

    String parseId(dynamic val, [String fallback = '1']) {
      if (val == null) return fallback;
      return val.toString();
    }

    return ReelModel(
      id: parseId(json['id'], '1'),
      videoUrl: json['video_url'] ?? '',
      thumbnailUrl: json['thumbnail_url'] ?? '',
      productId: parseId(product['id'] ?? json['product_id'] ?? json['dish_id'], '1'),
      productTitle: product['name'] ?? json['title'] ?? 'منتج مميز',
      productDescription: product['description'] ?? json['description'] ?? '',
      price: double.tryParse(product['base_price']?.toString() ?? product['price']?.toString() ?? '149') ?? 149.0,
      originalPrice: (product['original_price'] != null || product['compare_at_price'] != null)
          ? double.tryParse((product['original_price'] ?? product['compare_at_price']).toString())
          : 209.0,
      rating: double.tryParse(json['rating']?.toString() ?? '4.8') ?? 4.8,
      category: json['category'] ?? product['category_name'] ?? 'أكل بيتي',
      variants: product['variants'] is List ? product['variants'] as List : const [],
      modifierGroups: product['modifier_groups'] is List ? product['modifier_groups'] as List : const [],
      vendorId: parseId(vendor['id'] ?? json['store_id'] ?? json['merchant_id'], '1'),
      vendorName: vendor['store_name'] ?? vendor['name'] ?? 'مطبخ أم أحمد',
      vendorAvatar: vendor['logo_url'] ?? vendor['logo'] ?? '',
      isVerified: vendor['is_verified'] ?? true,
      likesCount: json['likes_count'] is int ? json['likes_count'] : 0,
      commentsCount: json['comments_count'] is int ? json['comments_count'] : 2300,
      sharesCount: json['shares_count'] is int ? json['shares_count'] : 6800,
      savesCount: json['saves_count'] is int ? json['saves_count'] : 0,
      isLiked: json['is_liked'] == true,
      isSaved: json['is_saved'] == true,
    );
  }
}
