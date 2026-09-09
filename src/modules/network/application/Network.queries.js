import { NotFoundException } from '../../../shared/domain/AppError.js';
import { MAX_CHILDREN_PER_NODE, clampDepth } from '../domain/Network.entity.js';

/**
 * Downline tree — iterative BFS, one query per level. Cycle-safe via a
 * visited set (corrupt `partnerOf` loops can't hang the request) and
 * bounded via depth cap + per-node child limit with `truncated` flags.
 */
export class GetDownlineTreeUseCase {
  /** @param {{network}} deps */
  constructor({ network }) {
    this.network = network;
  }

  async execute({ partnerId, depth }) {
    const maxDepth = clampDepth(depth);
    const root = await this.network.findNode(partnerId);
    if (!root) throw new NotFoundException('Partner not found');

    const visited = new Set([root.id]);
    const rootNode = { ...root, children: [], childCount: 0, truncated: false };
    let frontier = [rootNode];
    let total = 1;
    let truncatedAny = false;
    const perLevel = [1];

    for (let level = 0; level < maxDepth && frontier.length > 0; level++) {
      const parentIds = frontier.map((n) => n.id);
      const children = await this.network.findChildren(parentIds, MAX_CHILDREN_PER_NODE + 1);
      const byParent = new Map(parentIds.map((id) => [id, []]));
      for (const child of children) {
        if (visited.has(child.id)) continue; // cycle guard
        visited.add(child.id);
        if (byParent.has(child.parentId)) byParent.get(child.parentId).push(child);
      }
      const next = [];
      for (const node of frontier) {
        const kids = (byParent.get(node.id) ?? []).sort((a, b) =>
          String(a.username).localeCompare(String(b.username)),
        );
        node.childCount = kids.length > MAX_CHILDREN_PER_NODE ? MAX_CHILDREN_PER_NODE : kids.length;
        if (kids.length > MAX_CHILDREN_PER_NODE) {
          node.truncated = true;
          truncatedAny = true;
        }
        node.children = kids.slice(0, MAX_CHILDREN_PER_NODE).map((k) => ({
          ...k,
          children: [],
          childCount: 0,
          truncated: false,
        }));
        total += node.children.length;
        next.push(...node.children);
      }
      perLevel.push(next.length);
      frontier = next;
    }

    if (frontier.length > 0) truncatedAny = true; // depth cap cut deeper levels

    return {
      tree: rootNode,
      meta: { depth: maxDepth, total, perLevel, truncated: truncatedAny },
    };
  }
}

/** Upline chain — walk `partnerOf` to the root, cycle-guarded. */
export class GetUplineChainUseCase {
  /** @param {{network}} deps */
  constructor({ network }) {
    this.network = network;
  }

  async execute({ partnerId }) {
    const start = await this.network.findNode(partnerId);
    if (!start) throw new NotFoundException('Partner not found');
    const chain = [];
    const visited = new Set([start.id]);
    let currentParentId = start.parentId;
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const node = await this.network.findNode(currentParentId);
      if (!node) break;
      const { parentId: _up, ...projected } = node;
      chain.push(projected);
      currentParentId = node.parentId;
    }
    return { chain, depth: chain.length };
  }
}
