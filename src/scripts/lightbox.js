// Zoomable poster-photo lightbox (PhotoSwipe 5) for every [data-gallery] on the page.
// Each gallery link points at the zoom-resolution image and carries its pixel size, so
// PhotoSwipe can open at "fit" and zoom to 100% of a ~3000 px photo for reading poster text.
// Keyboard: arrows, Esc; touch: pinch, swipe; browser Back closes the lightbox.
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

for (const gallery of document.querySelectorAll("[data-gallery]")) {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a[data-pswp-width]",
    pswpModule: () => import("photoswipe"),
    bgOpacity: 0.94,
    wheelToZoom: true,
    initialZoomLevel: "fit",
    secondaryZoomLevel: 1,
    maxZoomLevel: 2,
    padding: { top: 16, bottom: 72, left: 8, right: 8 },
    showHideAnimationType: matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "zoom",
    closeTitle: "Close (Esc)",
    zoomTitle: "Zoom (Z)",
    arrowPrevTitle: "Previous (←)",
    arrowNextTitle: "Next (→)",
  });

  // Caption bar: the <template class="pswp-caption"> next to each link (title, session, paper link).
  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (el, pswp) => {
        pswp.on("change", () => {
          const link = pswp.currSlide?.data.element;
          const tpl = link?.parentElement?.querySelector("template.pswp-caption");
          el.innerHTML = tpl ? tpl.innerHTML : "";
        });
      },
    });
  });

  lightbox.init();
}
