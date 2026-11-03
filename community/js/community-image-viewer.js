document.addEventListener("DOMContentLoaded", function () {

    const viewer = document.getElementById("communityImageViewer");
    const fullImage = document.getElementById("communityFullImage");
    const closeBtn = document.getElementById("communityImageViewerClose");

    if (!viewer || !fullImage || !closeBtn) return;

    // فتح الصورة
    document.addEventListener("click", function (e) {

        const img = e.target.closest("#communityGrid img");

        if (!img) return;

        fullImage.src = img.currentSrc || img.src;
        fullImage.alt = img.alt || "صورة العضو";

        viewer.hidden = false;
        document.body.style.overflow = "hidden";
    });

    // إغلاق الصورة
    function closeViewer() {
        viewer.hidden = true;
        fullImage.src = "";
        document.body.style.overflow = "";
    }

    closeBtn.addEventListener("click", closeViewer);

    viewer.addEventListener("click", function (e) {
        if (e.target === viewer || e.target === fullImage) {
            closeViewer();
        }
    });

    // الإغلاق بزر Escape
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !viewer.hidden) {
            closeViewer();
        }
    });

});