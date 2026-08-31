export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME = "dark";

export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=s==="light"||s==="dark"||s==="system"?s:${JSON.stringify(DEFAULT_THEME)};var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
