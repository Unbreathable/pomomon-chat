import { onMount, onCleanup, createSignal } from "solid-js";

/** Decorative binary background that follows mouse movement (dark mode only). */
export default function BinaryBackground() {
  const [mouseX, setMouseX] = createSignal(50);
  const [mouseY, setMouseY] = createSignal(50);

  // Generate binary string and color once on component creation
  const binaryString = Array.from({ length: 15000 }, () =>
    Math.random() > 0.5 ? "1" : "0",
  ).join(" ");
  const hue = Math.floor(Math.random() * 360);

  onMount(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      setMouseX((e.clientX / window.innerWidth) * 100);
      setMouseY((e.clientY / window.innerHeight) * 100);
    };

    window.addEventListener("mousemove", handleMouseMove);
    onCleanup(() => window.removeEventListener("mousemove", handleMouseMove));
  });

  const maskGradient = () =>
    `radial-gradient(circle 30vmax at ${mouseX()}% ${mouseY()}%, black 0%, black 10%, transparent 80%)`;

  return (
    <div
      class="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 light:hidden"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 p-2 font-mono text-[11px] leading-relaxed break-all transition-[mask-position,-webkit-mask-position] duration-100 ease-out opacity-15"
        style={{
          color: `hsl(${hue}, 35%, 60%)`,
          "mask-image": maskGradient(),
          "-webkit-mask-image": maskGradient(),
        }}
      >
        {binaryString}
      </div>
    </div>
  );
}
