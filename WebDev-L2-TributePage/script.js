"use strict";

// If images/kalam.jpg is missing, show a styled monogram instead of a broken image icon.
const img = document.getElementById("portrait-img");
const frame = img.closest(".portrait");

function useFallback() {
  frame.classList.add("no-image");
}

img.addEventListener("error", useFallback);
if (img.complete && img.naturalWidth === 0) useFallback();
