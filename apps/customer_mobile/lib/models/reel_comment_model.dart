// lib/models/reel_comment_model.dart

class ReelCommentModel {
  final String id;
  final String reelId;
  final String? parentId;
  final String comment;
  int likesCount;
  bool isLiked;
  final bool isPinned;
  final String? createdAt;
  final String timeAgo;

  // بيانات المستخدم
  final String userId;
  final String userName;
  final String? userAvatar;

  // الردود (1 مستوى فقط)
  final List<ReelCommentModel> replies;

  ReelCommentModel({
    required this.id,
    required this.reelId,
    this.parentId,
    required this.comment,
    required this.likesCount,
    required this.isLiked,
    required this.isPinned,
    this.createdAt,
    required this.timeAgo,
    required this.userId,
    required this.userName,
    this.userAvatar,
    this.replies = const [],
  });

  factory ReelCommentModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};

    final rawReplies = json['replies'];
    final List<ReelCommentModel> parsedReplies = (rawReplies is List)
        ? rawReplies
            .whereType<Map<String, dynamic>>()
            .map((r) => ReelCommentModel.fromJson(r))
            .toList()
        : [];

    return ReelCommentModel(
      id:          json['id']?.toString() ?? '',
      reelId:      json['reel_id']?.toString() ?? '',
      parentId:    json['parent_id']?.toString(),
      comment:     json['comment']?.toString() ?? '',
      likesCount:  (json['likes_count'] as num?)?.toInt() ?? 0,
      isLiked:     json['is_liked'] == true,
      isPinned:    json['is_pinned'] == true,
      createdAt:   json['created_at']?.toString(),
      timeAgo:     json['time_ago']?.toString() ?? 'الآن',
      userId:      user['id']?.toString() ?? '',
      userName:    user['name']?.toString() ?? 'عميل سوقنا',
      userAvatar:  user['avatar_url']?.toString(),
      replies:     parsedReplies,
    );
  }

  /// أول حرف من الاسم لعرضه في الـ Avatar
  String get avatarLetter =>
      userName.isNotEmpty ? userName.trim()[0].toUpperCase() : '؟';

  /// نسخة معدّلة للـ optimistic UI (like toggle)
  ReelCommentModel copyWith({int? likesCount, bool? isLiked}) {
    return ReelCommentModel(
      id:          id,
      reelId:      reelId,
      parentId:    parentId,
      comment:     comment,
      likesCount:  likesCount ?? this.likesCount,
      isLiked:     isLiked ?? this.isLiked,
      isPinned:    isPinned,
      createdAt:   createdAt,
      timeAgo:     timeAgo,
      userId:      userId,
      userName:    userName,
      userAvatar:  userAvatar,
      replies:     replies,
    );
  }
}
