import {
  ForbiddenException, NotFoundException,
} from '../../../shared/domain/AppError.js';
import { LEADERSHIP_LEVELS, createCommentEntity, createPostEntity } from '../domain/Post.entity.js';
import { isAncestor } from '../../network/infrastructure/Network.mongo.repository.js';

const pageOf = (limit) => Math.min(Math.max(Number(limit) || 20, 1), 50);

async function viewerLevel(progress, viewerId) {
  if (!progress?.levelsFor) return null;
  const map = await progress.levelsFor([String(viewerId)]);
  return map[String(viewerId)] ?? null;
}

async function visible(post, viewerId, viewerIsLeader, { network }) {
  if (post.scope === 'global') return true;
  if (String(post.authorId) === String(viewerId)) return true;
  if (post.scope === 'team') return isAncestor(network, post.authorId, viewerId);
  if (post.scope === 'leadership') return viewerIsLeader;
  return false;
}

/** Cursor feed: global + visible team/leadership posts, newest first. */
export class GetFeedUseCase {
  /** @param {{community, network, progress}} deps */
  constructor({ community, network, progress }) {
    Object.assign(this, { community, network, progress });
  }

  async execute({ viewerId, before, limit = 20, now = new Date() }) {
    const lim = pageOf(limit);
    const cursor = before ? new Date(before) : new Date(now);
    const [reported, level] = await Promise.all([
      this.community.reportedByMe(viewerId),
      viewerLevel(this.progress, viewerId),
    ]);
    const viewerIsLeader = LEADERSHIP_LEVELS.includes(level);
    // Over-fetch, then visibility-filter (team checks walk the chain).
    const candidates = await this.community.recentCandidates(cursor, lim * 3 + 10, [...reported]);
    const visiblePosts = [];
    for (const post of candidates) {
      if (visiblePosts.length >= lim) break;
      // eslint-disable-next-line no-await-in-loop
      if (await visible(post, viewerId, viewerIsLeader, this)) visiblePosts.push(post);
    }
    const ids = visiblePosts.map((p) => p.id);
    const [likes, comments, liked, saved, authors] = await Promise.all([
      this.community.likeCounts('post', ids),
      this.community.commentCounts(ids),
      this.community.likedByMe('post', ids, viewerId),
      this.community.savedByMe(ids, viewerId),
      this.community.authorLabels(visiblePosts.map((p) => p.authorId)),
    ]);
    const items = visiblePosts.map((p) => ({
      ...p,
      author: authors[p.authorId] ?? null,
      likeCount: likes[p.id] ?? 0,
      commentCount: comments[p.id] ?? 0,
      likedByMe: liked.has(p.id),
      savedByMe: saved.has(p.id),
    }));
    const last = visiblePosts[visiblePosts.length - 1];
    return {
      items,
      nextCursor: last ? last.createdAt : null,
      viewerLevel: level,
    };
  }
}

export class CreatePostUseCase {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async execute({ authorId, ...input }) {
    return this.community.createPost({ ...createPostEntity(input), authorId, auto: false });
  }
}

export class ToggleLikeUseCase {
  /** @param {{community, network, progress}} deps (visibility-checked) */
  constructor({ community, network, progress }) {
    Object.assign(this, { community, network, progress });
  }

  async execute({ partnerId, postId }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    const level = await viewerLevel(this.progress, partnerId);
    if (!(await visible(post, partnerId, LEADERSHIP_LEVELS.includes(level), this))) {
      throw new ForbiddenException('You cannot interact with this post');
    }
    return this.community.toggleLike('post', postId, partnerId);
  }
}

export class ListCommentsUseCase {
  /** @param {{community, network, progress}} deps (visibility-checked) */
  constructor({ community, network, progress }) {
    Object.assign(this, { community, network, progress });
  }

  async execute({ partnerId, postId, limit = 100 }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    const level = await viewerLevel(this.progress, partnerId);
    if (!(await visible(post, partnerId, LEADERSHIP_LEVELS.includes(level), this))) {
      throw new ForbiddenException('You cannot view these comments');
    }
    const comments = await this.community.listComments(postId, Math.min(Math.max(Number(limit) || 100, 1), 200));
    const ids = comments.map((c) => c.id);
    const [likes, liked, authors] = await Promise.all([
      this.community.likeCounts('comment', ids),
      this.community.likedByMe('comment', ids, partnerId),
      this.community.authorLabels(comments.map((c) => c.authorId)),
    ]);
    return comments.map((c) => ({
      ...c,
      author: authors[c.authorId] ?? null,
      likeCount: likes[c.id] ?? 0,
      likedByMe: liked.has(c.id),
    }));
  }
}

export class AddCommentUseCase {
  /** @param {{community, network, progress}} deps (visibility-checked) */
  constructor({ community, network, progress }) {
    Object.assign(this, { community, network, progress });
  }

  async execute({ partnerId, postId, ...input }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    const level = await viewerLevel(this.progress, partnerId);
    if (!(await visible(post, partnerId, LEADERSHIP_LEVELS.includes(level), this))) {
      throw new ForbiddenException('You cannot comment on this post');
    }
    const { body } = createCommentEntity(input);
    return this.community.addComment({ postId, authorId: partnerId, body, parentId: input.parentId ?? null });
  }
}

export class ToggleSaveUseCase {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async execute({ partnerId, postId }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    return this.community.toggleSave(partnerId, postId);
  }
}

export class ReportPostUseCase {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async execute({ partnerId, postId, reason = '' }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    return this.community.report(partnerId, postId, String(reason ?? '').slice(0, 300));
  }
}

/** Authors pin their own announcements. */
export class PinPostUseCase {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async execute({ partnerId, postId, pinned }) {
    const post = await this.community.findPostById(postId);
    if (!post) throw new NotFoundException('Post not found');
    if (String(post.authorId) !== String(partnerId)) throw new ForbiddenException('Only the author can pin');
    if (post.kind !== 'announcement') throw new ForbiddenException('Only announcements can be pinned');
    return this.community.setPinned(postId, pinned === true);
  }
}

export class CommunityAnalyticsUseCase {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async execute({ days = 7 } = {}) {
    const d = Math.min(Math.max(Number(days) || 7, 1), 90);
    const since = new Date(Date.now() - d * 86400000);
    const { posts, likes, comments } = await this.community.engagementSince(since);
    const byKind = {};
    const byAuthor = {};
    for (const row of posts) {
      byKind[row._id.kind] = (byKind[row._id.kind] ?? 0) + row.count;
      byAuthor[String(row._id.author)] = (byAuthor[String(row._id.author)] ?? 0) + row.count;
    }
    const topIds = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    const labels = await this.community.authorLabels(topIds);
    return {
      days: d,
      posts: posts.reduce((s, r) => s + r.count, 0),
      likes,
      comments,
      byKind,
      topContributors: topIds.map((id) => ({ id, ...(labels[id] ?? { username: '', name: '' }), posts: byAuthor[id] })),
    };
  }
}

/**
 * System recognition — called by progression (promotions) and training
 * (certificates). Global scope so the whole community celebrates.
 */
export class RecognitionUseCases {
  /** @param {{community}} deps */
  constructor({ community }) {
    this.community = community;
  }

  async promotion(partnerId, from, to, authorName) {
    return this.community.createPost({
      authorId: partnerId,
      kind: 'recognition',
      title: `${authorName} is now ${String(to).replace(/_/g, ' ')}`,
      body: `Promoted from ${String(from).replace(/_/g, ' ')} — congratulate them.`,
      link: '',
      scope: 'global',
      auto: true,
      refType: 'promotion',
      refId: String(to),
    });
  }

  async certificate(partnerId, courseId, courseTitle, authorName) {
    return this.community.createPost({
      authorId: partnerId,
      kind: 'recognition',
      title: `${authorName} earned ${courseTitle}`,
      body: 'Certified and one step closer on the ladder.',
      link: '',
      scope: 'global',
      auto: true,
      refType: 'certificate',
      refId: String(courseId),
    });
  }
}
