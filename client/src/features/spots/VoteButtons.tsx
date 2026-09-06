import type { Post } from "@/types";

type Props = {
  post: Post;
  onVote: (value: "like" | "dislike") => void;
};

function ThumbUp() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M2 21h4V9H2v12Zm20-11c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.99Z"
      />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M22 3h-4v12h4V3ZM2 14c0 1.1.9 2 2 2h6.3l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2H7c-.83 0-1.54.5-1.84 1.22L2.14 11.27c-.09.23-.14.47-.14.73V14Z"
      />
    </svg>
  );
}

export function VoteButtons({ post, onVote }: Props) {
  return (
    <div className="vote-bar">
      <button
        type="button"
        className={`vote-btn like ${post.userReaction === "like" ? "on" : ""}`}
        title={post.userReaction === "like" ? "Убрать лайк" : "Нравится"}
        aria-pressed={post.userReaction === "like"}
        onClick={() => onVote("like")}
      >
        <ThumbUp />
        <span>{post.likesCount}</span>
      </button>
      <button
        type="button"
        className={`vote-btn dislike ${post.userReaction === "dislike" ? "on" : ""}`}
        title={post.userReaction === "dislike" ? "Убрать дизлайк" : "Не нравится"}
        aria-pressed={post.userReaction === "dislike"}
        onClick={() => onVote("dislike")}
      >
        <ThumbDown />
        <span>{post.dislikesCount}</span>
      </button>
    </div>
  );
}
