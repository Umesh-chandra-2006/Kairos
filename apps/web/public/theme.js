(() => {
  try {
    const stored = localStorage.getItem("kairos.theme");
    const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch {
    /* ignore */
  }
})();
