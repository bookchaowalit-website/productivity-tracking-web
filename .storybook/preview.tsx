import type { Preview, Decorator } from "@storybook/nextjs-vite";
import "../src/app/design-floor/tokens.css";
import "../src/app/app-theme.css";
import "../src/app/globals.css";

const FONT_CLASSES: string[] = [];
const HTML_CLASSES: string[] = [];

const VIEWPORTS = {
  w320: { name: "320 (small phone)", styles: { width: "320px", height: "640px" } },
  w375: { name: "375 (phone)", styles: { width: "375px", height: "812px" } },
  w768: { name: "768 (tablet)", styles: { width: "768px", height: "1024px" } },
  w1440: { name: "1440 (desktop)", styles: { width: "1440px", height: "900px" } },
};

// Mirrors the app root: <html lang>, font variables, layout classes and the .dark theme class.
const withAppShell: Decorator = (Story, context) => {
  const locale: string = context.globals.locale ?? "en";
  const theme = context.globals.theme === "dark" ? "dark" : "light";
  if (typeof document !== "undefined") {
    const html = document.documentElement;
    html.lang = locale;
    html.classList.add(...FONT_CLASSES, ...HTML_CLASSES);
    html.classList.toggle("font-thai", locale === "th" && false);
    html.classList.toggle("dark", theme === "dark");
    html.dataset.theme = theme;
    html.style.colorScheme = theme;
  }
  const content = (
    <div className={"antialiased"}>
      <Story />
    </div>
  );
  return content;
};

const preview: Preview = {
  decorators: [withAppShell],
  globalTypes: {
    locale: {
      description: "Locale",
      toolbar: { icon: "globe", items: [{ value: "en", title: "English" }], dynamicTitle: true },
    },
    theme: {
      description: "Theme",
      toolbar: { icon: "mirror", items: [{ value: "light", title: "Light" }, { value: "dark", title: "Dark" }], dynamicTitle: true },
    },
  },
  initialGlobals: { locale: "en", theme: "light" },
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
    viewport: { options: VIEWPORTS },
    a11y: { options: { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
