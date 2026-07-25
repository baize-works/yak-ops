import React from "react";
import {motion} from "framer-motion";

export const panelStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 0,
  border: "1px solid #eef2f6",
  boxShadow: "0 10px 30px rgba(31, 35, 41, 0.04)",
};

export const iconWrapStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(64,81,181,0.10)",
  color: "#4051b5",
  flexShrink: 0,
};


export const MotionDiv = motion.div;

export const BLUE = "hsl(231 48% 48%)";
export const TEXT_SECONDARY = "#667085";
export const BORDER_COLOR = "#EAECF0";
export const PAGE_BG = "#FFFFFF";
export const CARD_BG = "#FFFFFF";
export const BLUE_LIGHT = "#EEF4FF";

export const contentSwapVariants = {
  hidden: {opacity: 0, y: 10},
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};
