import { motion, useInView, Variants } from "framer-motion";
import { ReactNode, RefObject, useRef } from "react";
import { cn } from "@/lib/utils";

interface TimelineContentProps {
  children: ReactNode;
  animationNum: number;
  timelineRef: RefObject<HTMLElement>;
  customVariants?: Variants;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className,
  as: Component = "div",
}: TimelineContentProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  const defaultVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  const variants = customVariants || defaultVariants;

  return (
    <motion.div
      ref={ref}
      custom={animationNum}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={cn(className)}
      // @ts-ignore
      as={Component}
    >
      {children}
    </motion.div>
  );
}
