import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
    robots: 'noindex, nofollow'
}

export default function LabsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="labs-profile-v2">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:400,500,600,700&display=swap" />
            <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&display=swap" rel="stylesheet" />

            {/* Template CSS files from /labs/css/ */}
            {/* Link Lexend Font */}
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="/labs/css/bootstrap.min.css" />
            <link rel="stylesheet" href="/labs/css/aos.css" />
            <link rel="stylesheet" href="/labs/css/magnific-popup.css" />
            <link rel="stylesheet" href="/labs/css/owl.carousel.min.css" />
            <link rel="stylesheet" href="/labs/css/style.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />

            {children}

            <Script src="/labs/js/jquery-1.12.4.min.js" strategy="beforeInteractive" />
            <Script src="/labs/js/popper.min.js" strategy="beforeInteractive" />
            <Script src="/labs/js/bootstrap.min.js" strategy="lazyOnload" />
            <Script src="/labs/js/jarallax.min.js" strategy="lazyOnload" />
            <Script src="/labs/js/jquery.ajaxchimp.min.js" strategy="lazyOnload" />
            <Script src="/labs/js/jquery.validate.min.js" strategy="lazyOnload" />
            <Script src="/labs/js/jquery.magnific-popup.min.js" strategy="lazyOnload" />
            <Script src="/labs/js/aos.js" strategy="lazyOnload" />
            <Script src="/labs/js/owl.carousel.min.js" strategy="lazyOnload" />

            {/* Script to initialize template scripts after they are loaded */}
            <Script id="init-template-scripts" strategy="lazyOnload">
                {`
          window.initTemplateScripts = function() {
            if (window.AOS) AOS.init({ duration: 1000, once: true });
            if (window.jQuery && window.jQuery.fn.owlCarousel) {
                // Destroy existing instances to prevent duplication on re-render
                window.jQuery('.carousel-project').trigger('destroy.owl.carousel').removeClass('owl-loaded');
                window.jQuery('.carousel-project').find('.owl-stage-outer').children().unwrap();
                
                // Sub-functions to get counts safely
                var projectCount = window.jQuery('.carousel-project .project-item').length;
                var testimonialCount = window.jQuery('.carousel-testimonials .col-testimonial').length;

                window.jQuery('.carousel-project').owlCarousel({
                    margin: 45,
                    loop: projectCount > 1,
                    dots: true,
                    nav: true,
                    responsive:{
                        0:{ items:1 },
                        768:{ items:1 },
                        1200:{ items:1 }
                    }
                });

                
                window.jQuery('.carousel-testimonials').trigger('destroy.owl.carousel').removeClass('owl-loaded');
                window.jQuery('.carousel-testimonials').owlCarousel({
                    margin: 30,
                    loop: testimonialCount > 1,
                    dots: true,
                    nav: false,
                    responsive:{
                        0:{ items:1 },
                        768:{ items:1 },
                        1200:{ items: testimonialCount > 1 ? 2 : 1 }
                    }
                });

            }
            if (window.jQuery && window.jQuery.fn.magnificPopup) {
                window.jQuery('.popup-with-zoom-anim').magnificPopup({
                    type: 'inline',
                    fixedContentPos: false,
                    fixedBgPos: true,
                    overflowY: 'auto',
                    closeBtnInside: true,
                    preloader: false,
                    midClick: true,
                    removalDelay: 300,
                    mainClass: 'my-mfp-zoom-in'
                });
            }
          };
          // Try to init once on load
          setTimeout(window.initTemplateScripts, 1000);
        `}
            </Script>
        </div>
    )
}
