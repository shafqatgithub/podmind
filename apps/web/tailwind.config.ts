import type { Config } from "tailwindcss";
import { podmindPreset } from "../../packages/ui/tailwind-preset";

const config: Config = {
  presets: [podmindPreset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
