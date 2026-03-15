const prisma = require("../db/prisma");

async function listThreads() {
  const threads = await prisma.thread.findMany({
    orderBy: { bumpedAt: "desc" },
    include: {
      posts: {
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { posts: true }
      }
    }
  });

  return threads.map((thread) => {
    const [opPost, ...replies] = thread.posts;
    return {
      ...thread,
      opPost,
      replies,
      replyCount: Math.max(thread._count.posts - 1, 0),
      previewReplies: replies.slice(-3)
    };
  });
}

async function getThread(threadId) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      posts: {
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { posts: true }
      }
    }
  });

  if (!thread) {
    return null;
  }

  const [opPost, ...replies] = thread.posts;
  return {
    ...thread,
    opPost,
    replies,
    replyCount: Math.max(thread._count.posts - 1, 0)
  };
}

async function createThread({ subject, content }) {
  return prisma.$transaction(async (tx) => {
    const thread = await tx.thread.create({
      data: {
        subject,
        posts: {
          create: {
            subject,
            content,
            isOp: true
          }
        }
      },
      include: {
        posts: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return thread;
  });
}

async function createReply({ threadId, content, replyToId }) {
  return prisma.$transaction(async (tx) => {
    const thread = await tx.thread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      throw new Error("THREAD_NOT_FOUND");
    }

    let targetReplyId = null;

    if (replyToId) {
      const replyTarget = await tx.post.findUnique({
        where: { id: replyToId }
      });

      if (!replyTarget || replyTarget.threadId !== threadId) {
        throw new Error("INVALID_REPLY_TARGET");
      }

      targetReplyId = replyTarget.id;
    }

    const post = await tx.post.create({
      data: {
        threadId,
        content,
        replyToId: targetReplyId
      }
    });

    await tx.thread.update({
      where: { id: threadId },
      data: { bumpedAt: new Date() }
    });

    return post;
  });
}

async function deletePost(postId) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return null;
    }

    if (post.isOp) {
      await tx.thread.delete({ where: { id: post.threadId } });
      return { deletedThreadId: post.threadId, deletedPostId: postId, wasOp: true };
    }

    await tx.post.delete({ where: { id: postId } });
    return { deletedThreadId: post.threadId, deletedPostId: postId, wasOp: false };
  });
}

async function cleanupExpiredThreads(threadTtlDays) {
  if (!threadTtlDays || threadTtlDays <= 0) {
    return { count: 0 };
  }

  const cutoff = new Date(Date.now() - threadTtlDays * 24 * 60 * 60 * 1000);
  return prisma.thread.deleteMany({
    where: {
      bumpedAt: {
        lt: cutoff
      }
    }
  });
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  createReply,
  deletePost,
  cleanupExpiredThreads
};