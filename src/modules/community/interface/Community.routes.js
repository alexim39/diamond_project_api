import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  AddCommentUseCase, CommunityAnalyticsUseCase, CreatePostUseCase, DirectoryUseCase, GetFeedUseCase,
  ListCommentsUseCase, PinPostUseCase, ReportPostUseCase, ToggleLikeUseCase, ToggleSaveUseCase,
} from '../application/Community.usecases.js';
import { MongoCommunityStore } from '../infrastructure/Community.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';
import { MongoProgressionStore } from '../../progression/infrastructure/Progression.mongo.repository.js';
import { POST_KINDS, AUDIENCE_SCOPES } from '../domain/Post.entity.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const PostSchema = z.object({
  kind: z.enum(POST_KINDS),
  title: z.string().trim().max(120).optional().default(''),
  body: z.string().trim().min(1).max(2000),
  link: z.string().trim().max(500).optional().default(''),
  scope: z.enum(AUDIENCE_SCOPES),
});

const CommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  parentId: objectId.optional(),
});

const FeedQuery = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const PinSchema = z.object({ pinned: z.boolean() });
const ReportSchema = z.object({ reason: z.string().trim().max(300).optional().default('') });
const AnalyticsQuery = z.object({ days: z.coerce.number().int().min(1).max(90).optional().default(7) });

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildCommunityRouter = (deps = {}) => {
  const community = deps.community ?? new MongoCommunityStore();
  const network = deps.network ?? new MongoNetworkRepository();
  const progress = deps.progress ?? new MongoProgressionStore();

  const feed = new GetFeedUseCase({ community, network, progress });
  const create = new CreatePostUseCase({ community });
  const like = new ToggleLikeUseCase({ community, network, progress });
  const comments = new ListCommentsUseCase({ community, network, progress });
  const comment = new AddCommentUseCase({ community, network, progress });
  const save = new ToggleSaveUseCase({ community });
  const report = new ReportPostUseCase({ community });
  const pin = new PinPostUseCase({ community });
  const directory = new DirectoryUseCase({ community });
  const analytics = new CommunityAnalyticsUseCase({ community });

  const router = express.Router();
  router.use(requireAuth);

  router.get('/feed', validate({ query: FeedQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await feed.execute({ viewerId: req.auth?.partnerId, before: q?.before, limit: q?.limit });
    res.status(200).json({ message: 'Feed retrieved successfully', data, success: true });
  }));

  router.post('/', validate({ body: PostSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await create.execute({ authorId: req.auth?.partnerId, ...body });
    res.status(200).json({ message: 'Post created successfully', data, success: true });
  }));

  router.post('/:postId/like', validate({ params: z.object({ postId: objectId }) }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await like.execute({ partnerId: req.auth?.partnerId, postId: params.postId });
    res.status(200).json({ message: 'Like toggled successfully', data, success: true });
  }));

  router.get('/:postId/comments', validate({ params: z.object({ postId: objectId }) }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await comments.execute({ partnerId: req.auth?.partnerId, postId: params.postId });
    res.status(200).json({ message: 'Comments retrieved successfully', data, success: true });
  }));

  router.post('/:postId/comments', validate({ params: z.object({ postId: objectId }), body: CommentSchema }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await comment.execute({ partnerId: req.auth?.partnerId, postId: params.postId, ...body });
    res.status(200).json({ message: 'Comment added successfully', data, success: true });
  }));

  router.post('/:postId/save', validate({ params: z.object({ postId: objectId }) }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await save.execute({ partnerId: req.auth?.partnerId, postId: params.postId });
    res.status(200).json({ message: 'Save toggled successfully', data, success: true });
  }));

  router.post('/:postId/report', validate({ params: z.object({ postId: objectId }), body: ReportSchema }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await report.execute({ partnerId: req.auth?.partnerId, postId: params.postId, reason: body?.reason });
    res.status(200).json({ message: 'Post reported successfully', data, success: true });
  }));

  router.post('/:postId/pin', validate({ params: z.object({ postId: objectId }), body: PinSchema }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await pin.execute({ partnerId: req.auth?.partnerId, postId: params.postId, pinned: body?.pinned });
    res.status(200).json({ message: 'Pin updated successfully', data, success: true });
  }));

  router.get('/analytics/overview', validate({ query: AnalyticsQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await analytics.execute({ days: q?.days });
    res.status(200).json({ message: 'Community analytics retrieved successfully', data, success: true });
  }));

  router.get('/directory', validate({ query: z.object({ q: z.string().trim().min(2).max(40) }) }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await directory.execute({ query: q?.q });
    res.status(200).json({ message: 'Directory retrieved successfully', data, success: true });
  }));

  router.post('/comments/:commentId/like', validate({ params: z.object({ commentId: objectId }) }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await like.execute({ partnerId: req.auth?.partnerId, commentId: params.commentId });
    res.status(200).json({ message: 'Like toggled successfully', data, success: true });
  }));

  return router;
};

export default buildCommunityRouter();
