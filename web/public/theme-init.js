// Runs before the page paints so there's no flash of the wrong theme.
(function () {
    var pref = "system";
    try {
        pref = localStorage.getItem("choretrack-theme") || "system";
    } catch (e) {}
    var dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
})();
