document.addEventListener("DOMContentLoaded", () => {

    renderHome();

    const floatingContactBtn =
        document.getElementById("floatingContactBtn");

    const floatingContactOptions =
        document.querySelector(".floating-contact-options");

    const supportBtn =
        document.getElementById("supportBtn");

    const supportModal =
        document.getElementById("supportModal");

    const supportModalClose =
        document.getElementById("supportModalClose");

    const copyCashNumber =
        document.getElementById("copyCashNumber");

    const cashNumber =
        document.getElementById("cashNumber");


    /* فتح وإغلاق قائمة الدعم والتواصل */

    floatingContactBtn.addEventListener("click", () => {

        const isOpen =
            floatingContactOptions.classList.toggle("active");

        floatingContactBtn.classList.toggle("active", isOpen);

        floatingContactBtn.setAttribute(
            "aria-expanded",
            isOpen
        );

    });


    /* فتح نافذة الدعم */

    supportBtn.addEventListener("click", () => {

        supportModal.classList.add("active");

        supportModal.setAttribute(
            "aria-hidden",
            "false"
        );

    });


    /* إغلاق نافذة الدعم */

    supportModalClose.addEventListener("click", () => {

        supportModal.classList.remove("active");

        supportModal.setAttribute(
            "aria-hidden",
            "true"
        );

    });


    /* إغلاق النافذة عند الضغط على الخلفية */

    supportModal.addEventListener("click", (event) => {

        if (event.target === supportModal) {

            supportModal.classList.remove("active");

            supportModal.setAttribute(
                "aria-hidden",
                "true"
            );

        }

    });


    /* نسخ رقم فودافون كاش */

    copyCashNumber.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(
                cashNumber.textContent.trim()
            );

            copyCashNumber.textContent =
                "تم نسخ الرقم ✓";

            setTimeout(() => {

                copyCashNumber.textContent =
                    "نسخ الرقم";

            }, 2000);

        } catch (error) {

            alert("تعذر نسخ الرقم، يمكنك نسخه يدويًا.");

        }

    });

});


window.addEventListener("scroll", toggleScrollBtn);