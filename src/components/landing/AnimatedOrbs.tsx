import { motion } from "framer-motion";

export function AnimatedOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large primary orb */}
      <motion.div
        className="absolute top-1/4 left-1/2 h-[600px] w-[900px] rounded-full bg-primary/15 blur-[120px]"
        animate={{
          x: ["-55%", "-45%", "-55%"],
          y: ["-10%", "10%", "-10%"],
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Accent orb top-right */}
      <motion.div
        className="absolute top-20 right-[5%] h-72 w-72 rounded-full bg-accent/15 blur-[100px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Small floating orb bottom-left */}
      <motion.div
        className="absolute bottom-1/4 left-[10%] h-48 w-48 rounded-full bg-primary-glow/20 blur-[80px]"
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Bottom-right accent */}
      <motion.div
        className="absolute bottom-[10%] right-[15%] h-56 w-56 rounded-full bg-accent/10 blur-[90px]"
        animate={{
          x: [0, -25, 0],
          y: [0, -15, 0],
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.45, 0.3],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  );
}
