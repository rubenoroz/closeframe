window.initTemplateScripts = function () {
    (function ($) {
        'use strict';

        /* Window Load */
        $('.loader').fadeOut(200);

        /* Parallax */
        if ($('.jarallax').length && $.fn.jarallax) {
            $('.jarallax').jarallax({
                speed: 0.75
            });
        }

        if (typeof AOS !== 'undefined') {
            AOS.init({
                easing: 'ease-out-quad',
                duration: 600,
                offset: 0,   // Trigger as soon as the element enters the viewport
                once: true,
                mirror: false
            });
            // Recalculate positions multiple times during load to handle dynamic content/images
            [100, 500, 1000].forEach(delay => setTimeout(() => AOS.refresh(), delay));
        }

        /* Navbar Fixed */
        var navbarDesctop = $('.navbar-desctop');
        if (navbarDesctop.length) {
            var origOffsetY = 50; // Hardcoded because React hydration causes `offset().top` to fluctuate if images load late

            $(window).off('scroll.navbar').on('scroll.navbar', function () {
                if ($(window).scrollTop() > origOffsetY) {
                    navbarDesctop.addClass('fixed');
                } else {
                    navbarDesctop.removeClass('fixed');
                }
            });
        }

        /* Navbar scroll*/
        $('body:not(.fullpage) .navbar ul li a').off('click.nav').on('click.nav', function () {
            var target = $(this.hash);
            if (target.length) {
                $('html,body').animate({
                    scrollTop: (target.offset().top)
                }, 1000);
                $('body').removeClass('menu-is-opened').addClass('menu-is-closed');
                return false;
            }
        });

        /* Scrollspy*/
        if ($.fn.scrollspy) {
            $('body:not(.fullpage)').scrollspy({ target: '#scrollspy' });
        }

        /* Full page scroll*/
        if ($('#pagepiling').length > 0 && $.fn.pagepiling) {

            $('#pagepiling').pagepiling({
                scrollingSpeed: 280,

                menu: '.navbar-nav',
                anchors: ['home', 'about', 'video', 'experience', 'specialization', 'projects', 'partners', 'news'],
                afterRender: function (anchorLink, index) {
                    NavbarColor();
                },
                afterLoad: function (anchorLink, index) {
                    $('.pp-section .intro').removeClass('animate');
                    $('.active .intro').addClass('animate');
                    NavbarColor();

                }
            });

            $(".pp-scrollable .intro").wrapInner("<div class='scroll-wrap'>");

            function NavbarColor() {
                if ($('.pp-section.active').hasClass('navbar-is-white')) {
                    $('.navbar-desctop').addClass('navbar-white');
                    $('#pp-nav').addClass('pp-nav-white');
                }
                else {
                    $('.navbar-desctop').removeClass('navbar-white');
                    $('#pp-nav').removeClass('pp-nav-white');
                }
            }
        }

        /* Navbar toggler */
        $('.toggler').off('click.toggler').on('click.toggler', function () {
            $('body').addClass('menu-is-open');
        });

        $('.close, .click-capture').off('click.close').on('click.close', function () {
            $('body').removeClass('menu-is-open');
        });

        /* Navbar mobile */
        $('.navbar-nav-mobile li a').off('click.mobile').on('click.mobile', function () {
            $('body').removeClass('menu-is-open');
            $('.navbar-nav-mobile li a').removeClass('active');
            $(this).addClass('active');
        });

        /* Pop up*/
        if ($.fn.magnificPopup) {
            $('.popup-with-zoom-anim').magnificPopup({
                type: 'inline',
                fixedBgPos: true,
                overflowY: 'auto',
                closeBtnInside: true,
                preloader: false,
                midClick: true,
                removalDelay: 300,
                mainClass: 'my-mfp-zoom-in'
            });

            $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
                disableOn: 700,
                type: 'iframe',
                mainClass: 'mfp-fade',
                removalDelay: 160,
                preloader: false,
                fixedContentPos: false
            });
        }

        /* Carousel project */
        if ($.fn.owlCarousel) {
            $('.carousel-project').owlCarousel({
                loop: false,
                margin: 10,
                nav: true,
                dots: true,
                items: 1
            });

            /* Carousel project2 */
            $('.carousel-project-2').owlCarousel({
                loop: false,
                margin: 0,
                nav: true,
                dots: true,
                responsive: {
                    0: {
                        items: 1,
                        margin: 0,
                        dots: true
                    },
                    992: {
                        items: 2,
                        margin: 0,
                        dots: true
                    }
                }
            });

            /* Carousel testimonials */
            $('.carousel-testimonials').owlCarousel({
                loop: true,
                margin: 10,
                dots: true,
                responsive: {
                    0: {
                        items: 1
                    },
                    992: {
                        items: 2,
                        margin: 20,
                        dots: true
                    }
                }
            });

            /* Carousel testimonials 2 */
            $('.carousel-testimonials-2').owlCarousel({
                loop: true,
                margin: 10,
                dots: true,
                responsive: {
                    0: {
                        items: 1
                    }
                }
            });
        }

    })(window.jQuery);
};

// Also try auto-init on load for normal pages
if (typeof jQuery !== 'undefined') {
    $(document).ready(function () {
        if (window.initTemplateScripts) window.initTemplateScripts();
    });
}
