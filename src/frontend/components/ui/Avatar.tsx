type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  userId: string;
  username: string;
  size?: AvatarSize;
  viewTransitionName?: string;
  class?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

/** Displays a user's avatar image with consistent styling. */
export default function Avatar(props: AvatarProps) {
  const sizeClass = SIZE_CLASSES[props.size ?? "md"];

  return (
    <div
      class={`flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeClass} ${props.class ?? ""}`}
      style={
        props.viewTransitionName
          ? `view-transition-name: ${props.viewTransitionName}`
          : undefined
      }
    >
      <img
        src={`/api/users/${props.userId}/avatar`}
        alt={props.username}
        class="h-full w-full object-cover"
      />
    </div>
  );
}
