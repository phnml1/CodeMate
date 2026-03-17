export type ReactionEmoji = "👍" | "❤️" | "🎉" | "🚀" | "👀"

export type Reactions = Partial<Record<ReactionEmoji, string[]>>

export interface CommentAuthor {
  id: string
  name: string | null
  image: string | null
}

export interface Comment {
  id: string
  content: string
  lineNumber: number | null
  filePath: string | null
  isResolved: boolean
  pullRequestId: string
  authorId: string
  parentId: string | null
  mentions: string[]
  reactions: Reactions
  createdAt: string
  updatedAt: string
}

export interface CommentWithAuthor extends Comment {
  author: CommentAuthor
  replies: CommentWithAuthor[]
}

export interface CreateCommentInput {
  content: string
  parentId?: string
  lineNumber?: number
  filePath?: string
  mentions?: string[]
}

export interface UpdateCommentInput {
  content: string
}

export interface MentionUser {
  id: string
  name: string | null
  image: string | null
}
