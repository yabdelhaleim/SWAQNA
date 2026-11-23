// lib/screens/home/reels_comments_sheet.dart
//
// نظام التعليقات التفاعلي على الريلز — تصميم TikTok / Instagram-level
// DraggableScrollableSheet + WebSocket real-time + AnimatedList + Replies

import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';

import '../../models/reel_model.dart';
import '../../models/reel_comment_model.dart';
import '../../services/api_service.dart';
import '../../services/websocket_service.dart';
import '../../theme/app_theme.dart';

class ReelsCommentsSheet extends StatefulWidget {
  final ReelModel reel;

  const ReelsCommentsSheet({super.key, required this.reel});

  @override
  State<ReelsCommentsSheet> createState() => _ReelsCommentsSheetState();
}

class _ReelsCommentsSheetState extends State<ReelsCommentsSheet>
    with SingleTickerProviderStateMixin {
  // ─── State ───────────────────────────────────────────────────────────────
  final List<ReelCommentModel> _comments = [];
  final GlobalKey<AnimatedListState> _listKey = GlobalKey();

  final TextEditingController _textCtrl = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final ScrollController _scrollCtrl = ScrollController();

  bool _isLoading = true;
  bool _isSending = false;
  bool _hasMore = false;
  bool _isLoadingMore = false;
  String? _nextCursor;

  int _commentsCount = 0;

  // وضع الرد
  ReelCommentModel? _replyTarget;

  // animation controller للـ send button
  late AnimationController _sendAnim;
  late Animation<double> _sendScale;

  // ─── Init ─────────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _commentsCount = widget.reel.commentsCount;

    _sendAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _sendScale = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _sendAnim, curve: Curves.easeOut),
    );

    _textCtrl.addListener(() => setState(() {}));
    _loadComments();
    _subscribeWebSocket();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    ReverbWebSocket().leavePublicChannel('reels.${widget.reel.id}');
    _textCtrl.dispose();
    _focusNode.dispose();
    _scrollCtrl.dispose();
    _sendAnim.dispose();
    super.dispose();
  }

  // ─── WebSocket ────────────────────────────────────────────────────────────
  void _subscribeWebSocket() {
    ReverbWebSocket().listenPublic(
      channelName: 'reels.${widget.reel.id}',
      eventName: 'ReelCommentPosted',
      callback: _onNewCommentFromSocket,
    );
  }

  void _onNewCommentFromSocket(Map<String, dynamic> data) {
    // تجاهل لو مش top-level comment
    if (data['parent_id'] != null) return;

    final comment = ReelCommentModel.fromJson(data);

    // تجنّب التكرار (لو النشر جاء من نفس الجهاز)
    if (_comments.any((c) => c.id == comment.id)) return;

    if (!mounted) return;
    setState(() {
      _comments.insert(0, comment);
      _commentsCount++;
    });
    _listKey.currentState?.insertItem(0, duration: const Duration(milliseconds: 400));
  }

  // ─── Load Comments ────────────────────────────────────────────────────────
  Future<void> _loadComments({bool loadMore = false}) async {
    if (loadMore && (_isLoadingMore || !_hasMore)) return;
    if (!loadMore) setState(() => _isLoading = true);
    if (loadMore) setState(() => _isLoadingMore = true);

    try {
      final result = await ApiService.getReelComments(
        widget.reel.id,
        cursor: loadMore ? _nextCursor : null,
      );
      final newComments = result['comments'] as List<ReelCommentModel>;
      _nextCursor = result['next_cursor'] as String?;
      _hasMore    = result['has_more'] as bool? ?? false;
      final reelMeta = result['reel'] as Map<String, dynamic>? ?? {};

      if (!mounted) return;
      setState(() {
        if (!loadMore) {
          _comments.clear();
          _commentsCount = (reelMeta['comments_count'] as int?) ?? _commentsCount;
        }
        _comments.addAll(newComments);
        _isLoading    = false;
        _isLoadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading    = false;
        _isLoadingMore = false;
      });
    }
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      _loadComments(loadMore: true);
    }
  }

  // ─── Post Comment ─────────────────────────────────────────────────────────
  Future<void> _submitComment() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty || _isSending) return;

    _sendAnim.forward().then((_) => _sendAnim.reverse());
    setState(() => _isSending = true);

    try {
      final newComment = await ApiService.postReelComment(
        widget.reel.id,
        text,
        parentId: _replyTarget?.id,
      );

      _textCtrl.clear();
      final wasReply = _replyTarget != null;
      final parentId = _replyTarget?.id;

      if (!mounted) return;
      setState(() {
        _isSending    = false;
        _replyTarget  = null;

        if (wasReply && parentId != null) {
          // أضف الرد تحت أبوه في الـ list
          final parentIdx = _comments.indexWhere((c) => c.id == parentId);
          if (parentIdx != -1) {
            _comments[parentIdx].replies.add(newComment);
            _commentsCount++;
          }
        } else {
          // تعليق جديد — سيأتي عبر WebSocket لكن أضفه optimistically
          _comments.insert(0, newComment);
          _commentsCount++;
          _listKey.currentState?.insertItem(0, duration: const Duration(milliseconds: 350));
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('تعذّر نشر التعليق، حاول مجدداً'),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // ─── Toggle Like ──────────────────────────────────────────────────────────
  Future<void> _toggleLike(ReelCommentModel comment) async {
    // Optimistic UI
    setState(() {
      comment.isLiked     = !comment.isLiked;
      comment.likesCount += comment.isLiked ? 1 : -1;
    });

    try {
      final res = await ApiService.toggleCommentLike(comment.id);
      if (!mounted) return;
      setState(() {
        comment.isLiked    = res['is_liked'] as bool? ?? comment.isLiked;
        comment.likesCount = (res['likes_count'] as int?) ?? comment.likesCount;
      });
    } catch (_) {
      // rollback
      if (!mounted) return;
      setState(() {
        comment.isLiked     = !comment.isLiked;
        comment.likesCount += comment.isLiked ? 1 : -1;
      });
    }
  }

  // ─── Delete Comment ───────────────────────────────────────────────────────
  Future<void> _deleteComment(ReelCommentModel comment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.darkCardBg,
        title: const Text('حذف التعليق؟', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: const Text('هل تريد حذف هذا التعليق نهائياً؟', style: TextStyle(color: AppTheme.textGrey, fontFamily: 'Cairo')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('لا', style: TextStyle(color: AppTheme.textGrey))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('احذف', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ApiService.deleteReelComment(comment.id);
      if (!mounted) return;
      final idx = _comments.indexWhere((c) => c.id == comment.id);
      if (idx != -1) {
        final removed = _comments.removeAt(idx);
        _listKey.currentState?.removeItem(
          idx,
          (ctx, anim) => _buildCommentTile(removed, idx, animation: anim),
          duration: const Duration(milliseconds: 300),
        );
        setState(() => _commentsCount--);
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذّر الحذف')),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.56,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      snap: true,
      snapSizes: const [0.56, 0.92],
      builder: (ctx, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0E0F11).withAlpha(240),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(
                  top: BorderSide(color: AppTheme.gold.withAlpha(40), width: 1),
                ),
              ),
              child: Column(
                children: [
                  _buildHandle(),
                  _buildHeader(),
                  const Divider(color: Color(0xFF2A2A2A), height: 1),
                  Expanded(child: _buildCommentList(scrollController)),
                  _buildInputBar(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ─── Handle bar ───────────────────────────────────────────────────────────
  Widget _buildHandle() {
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 4),
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: const Color(0xFF3A3A3A),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }

  // ─── Header ───────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          // عدد التعليقات مع animation
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Text(
              '💬 $_commentsCount تعليق',
              key: ValueKey(_commentsCount),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                fontFamily: 'Cairo',
              ),
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Color(0xFF2A2A2A),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Comment List ─────────────────────────────────────────────────────────
  Widget _buildCommentList(ScrollController scrollController) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
      );
    }

    if (_comments.isEmpty) {
      return _buildEmptyState();
    }

    return AnimatedList(
      key: _listKey,
      controller: scrollController,
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      initialItemCount: _comments.length + (_isLoadingMore ? 1 : 0),
      itemBuilder: (ctx, index, animation) {
        if (index >= _comments.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2)),
          );
        }
        return _buildCommentTile(_comments[index], index, animation: animation);
      },
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🍽️', style: TextStyle(fontSize: 52)),
          const SizedBox(height: 16),
          const Text(
            'كن أول من يعلّق على هذه الوجبة الشهية!',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 15,
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'شارك رأيك مع الجميع 🎉',
            style: TextStyle(
              color: Colors.white.withAlpha(100),
              fontSize: 13,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }

  // ─── Single Comment Tile ──────────────────────────────────────────────────
  Widget _buildCommentTile(
    ReelCommentModel comment,
    int index, {
    Animation<double>? animation,
    bool isReply = false,
  }) {
    final tile = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // بنر التثبيت
        if (comment.isPinned && !isReply)
          Padding(
            padding: const EdgeInsets.only(right: 16, bottom: 4),
            child: Row(
              children: [
                const Icon(Icons.push_pin_rounded, size: 13, color: AppTheme.gold),
                const SizedBox(width: 4),
                Text(
                  'تعليق مثبّت',
                  style: TextStyle(
                    color: AppTheme.gold.withAlpha(200),
                    fontSize: 11,
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

        // جسم التعليق
        Padding(
          padding: EdgeInsetsDirectional.only(
            start: isReply ? 56 : 16,
            end: 16,
            bottom: 12,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // avatar
              _buildAvatar(comment, isReply: isReply),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // اسم + وقت
                    Row(
                      children: [
                        Text(
                          comment.userName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          comment.timeAgo,
                          style: const TextStyle(
                            color: AppTheme.textGrey,
                            fontSize: 11,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        if (comment.isPinned && !isReply) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.push_pin_rounded, size: 12, color: AppTheme.gold),
                        ],
                      ],
                    ),

                    const SizedBox(height: 4),

                    // نص التعليق
                    _ExpandableText(text: comment.comment),

                    const SizedBox(height: 8),

                    // أزرار: رد + حذف
                    Row(
                      children: [
                        if (!isReply)
                          GestureDetector(
                            onTap: () {
                              setState(() => _replyTarget = comment);
                              _focusNode.requestFocus();
                            },
                            child: const Text(
                              'رد',
                              style: TextStyle(
                                color: AppTheme.textGrey,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ),
                        const SizedBox(width: 16),
                        // زر الحذف (يظهر فقط لصاحب التعليق)
                        // في production: قارن comment.userId بـ userId المحفوظ
                        GestureDetector(
                          onTap: () => _deleteComment(comment),
                          child: const Text(
                            'حذف',
                            style: TextStyle(
                              color: Color(0xFF666666),
                              fontSize: 11,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // زر الإعجاب
              _LikeButton(
                isLiked: comment.isLiked,
                count: comment.likesCount,
                onTap: () => _toggleLike(comment),
              ),
            ],
          ),
        ),

        // الردود (مستوى واحد فقط)
        if (!isReply && comment.replies.isNotEmpty) ...[
          ...comment.replies.map(
            (reply) => Container(
              margin: const EdgeInsetsDirectional.only(start: 56),
              decoration: const BoxDecoration(
                border: Border(
                  right: BorderSide(color: AppTheme.gold, width: 2),
                ),
              ),
              child: _buildCommentTile(reply, 0, isReply: true),
            ),
          ),
        ],
      ],
    );

    if (animation == null) return tile;

    return SizeTransition(
      sizeFactor: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeIn),
        child: tile,
      ),
    );
  }

  // ─── Avatar Widget ────────────────────────────────────────────────────────
  Widget _buildAvatar(ReelCommentModel comment, {bool isReply = false}) {
    final size = isReply ? 32.0 : 40.0;
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppTheme.gold, AppTheme.primaryOrange],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        comment.avatarLetter,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontFamily: 'Cairo',
          fontSize: isReply ? 13 : 16,
        ),
      ),
    );
  }

  // ─── Input Bar ────────────────────────────────────────────────────────────
  Widget _buildInputBar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF131517),
        border: Border(top: BorderSide(color: const Color(0xFF2A2A2A).withAlpha(200))),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // شريط الرد إذا كان في وضع رد
            if (_replyTarget != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: AppTheme.gold.withAlpha(20),
                child: Row(
                  children: [
                    Icon(Icons.reply_rounded, size: 16, color: AppTheme.gold.withAlpha(200)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'رد على ${_replyTarget!.userName}',
                        style: TextStyle(
                          color: AppTheme.gold.withAlpha(200),
                          fontSize: 12,
                          fontFamily: 'Cairo',
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _replyTarget = null),
                      child: Icon(Icons.close_rounded, size: 16, color: AppTheme.gold.withAlpha(180)),
                    ),
                  ],
                ),
              ),

            // حقل الإدخال
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  // avatar المستخدم الحالي
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2A5C55), AppTheme.darkTeal],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      border: Border.all(color: AppTheme.gold.withAlpha(80), width: 1.5),
                    ),
                    alignment: Alignment.center,
                    child: const Text('أ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15)),
                  ),
                  const SizedBox(width: 10),

                  // حقل النص
                  Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1F2124),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _focusNode.hasFocus
                              ? AppTheme.gold.withAlpha(160)
                              : const Color(0xFF3A3A3A),
                          width: 1.5,
                        ),
                      ),
                      child: TextField(
                        controller: _textCtrl,
                        focusNode: _focusNode,
                        textDirection: TextDirection.rtl,
                        maxLines: 4,
                        minLines: 1,
                        maxLength: 500,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontFamily: 'Cairo',
                        ),
                        decoration: InputDecoration(
                          hintText: _replyTarget != null
                              ? 'اكتب ردّك...'
                              : 'أضف تعليقك على الوجبة...',
                          hintStyle: const TextStyle(
                            color: AppTheme.textGrey,
                            fontSize: 13,
                            fontFamily: 'Cairo',
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          counterText: '',
                        ),
                        onSubmitted: (_) => _submitComment(),
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),

                  // زر الإرسال
                  ScaleTransition(
                    scale: _sendScale,
                    child: GestureDetector(
                      onTap: _isSending ? null : _submitComment,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _textCtrl.text.trim().isEmpty
                              ? const Color(0xFF2A2A2A)
                              : AppTheme.gold,
                          boxShadow: _textCtrl.text.trim().isNotEmpty
                              ? [BoxShadow(color: AppTheme.gold.withAlpha(80), blurRadius: 12, spreadRadius: 1)]
                              : [],
                        ),
                        child: _isSending
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: CircularProgressIndicator(
                                  color: Colors.black,
                                  strokeWidth: 2,
                                ),
                              )
                            : Icon(
                                Icons.send_rounded,
                                size: 20,
                                color: _textCtrl.text.trim().isEmpty
                                    ? const Color(0xFF555555)
                                    : Colors.black,
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Like Button Widget — مع animation قلب
// ─────────────────────────────────────────────────────────────────────────────
class _LikeButton extends StatefulWidget {
  final bool isLiked;
  final int count;
  final VoidCallback onTap;

  const _LikeButton({
    required this.isLiked,
    required this.count,
    required this.onTap,
  });

  @override
  State<_LikeButton> createState() => _LikeButtonState();
}

class _LikeButtonState extends State<_LikeButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      lowerBound: 0.75,
      upperBound: 1.0,
      value: 1.0,
    );
    _scale = _ctrl;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _handleTap() {
    _ctrl.reverse().then((_) => _ctrl.forward());
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: ScaleTransition(
        scale: _scale,
        child: Column(
          children: [
            Icon(
              widget.isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: widget.isLiked ? Colors.red : AppTheme.textGrey,
              size: 20,
            ),
            const SizedBox(height: 2),
            Text(
              widget.count > 0 ? '${widget.count}' : '',
              style: TextStyle(
                color: widget.isLiked ? Colors.red : AppTheme.textGrey,
                fontSize: 11,
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expandable Text — "اقرأ أكثر" للتعليقات الطويلة
// ─────────────────────────────────────────────────────────────────────────────
class _ExpandableText extends StatefulWidget {
  final String text;

  const _ExpandableText({required this.text});

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final isLong = widget.text.length > 120;
    final displayText = (!_expanded && isLong)
        ? '${widget.text.substring(0, 120)}...'
        : widget.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          displayText,
          textDirection: TextDirection.rtl,
          style: const TextStyle(
            color: Color(0xFFDDDDDD),
            fontSize: 14,
            fontFamily: 'Cairo',
            height: 1.5,
          ),
        ),
        if (isLong) ...[
          const SizedBox(height: 2),
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Text(
              _expanded ? 'اقرأ أقل' : 'اقرأ أكثر',
              style: const TextStyle(
                color: AppTheme.gold,
                fontSize: 12,
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
