import { POST_TAG_BOT } from "@/shared/tags";

export function PostTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="post-tags">
      {tags.map((tag) => (
        <span key={tag} className={`post-tag${tag === POST_TAG_BOT ? " bot" : ""}`}>
          {tag}
        </span>
      ))}
    </span>
  );
}
