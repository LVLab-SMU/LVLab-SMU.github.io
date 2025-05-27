(function () {
    "use strict";

    //Full Screen Search
    $('.search-trigger').on('click', function (e) {
        e.preventDefault();
        $('.search-wrap').animate({ opacity: 'toggle' }, 500);
        $('.nav-search, #search-close').addClass("open");
    });
    $('.search-close').on('click', function (e) {
        e.preventDefault();
        $('.search-wrap').animate({ opacity: 'toggle' }, 500);
        $('.nav-search, #search-close').removeClass("open");
    });
    function closeSearch() {
        $('.search-wrap').fadeOut(200);
        $('.nav-search, #search-close').removeClass("open");
    }
    $(document.body).on('click', function (e) {
        closeSearch();
    });
    $(".search-trigger, .main-search-input").on('click', function (e) {
        e.stopPropagation();
    });

    //Team Carousel
    $(".team-carousel").owlCarousel({
        items: 4,
        margin: 30,
        dots: false,
        nav: false,
        //navText: ["<i class='icon-arrow-left'></i>", "<i class='icon-arrow-right'></i>"],
        loop: true,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            },
            480: {
                items: 1
            },
            768: {
                items: 3
            },
            992: {
                items: 4
            }
        }
    });

    // Partners Carousel
    $(".partners-carousel").owlCarousel({
        items: 6,
        margin: 60,
        dots: false,
        nav: false,
        //navText: ["<i class='icon-arrow-left'></i>", "<i class='icon-arrow-right'></i>"],
        loop: true,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            },
            480: {
                items: 2
            },
            768: {
                items: 3
            },
            992: {
                items: 6
            }
        }
    });

    //Team Carousel
    $(".team-carousel").owlCarousel({
        items: 4,
        margin: 30,
        dots: false,
        nav: false,
        //navText: ["<i class='icon-arrow-left'></i>", "<i class='icon-arrow-right'></i>"],
        loop: true,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            },
            480: {
                items: 1
            },
            768: {
                items: 3
            },
            992: {
                items: 4
            }
        }
    });

    // Project Gallery
    $(".project-gallery").owlCarousel({
        items: 4,
        margin: 30,
        dots: false,
        nav: true,
        navText: ["<i class='icon-arrow-left'></i>", "<i class='icon-arrow-right'></i>"],
        loop: false,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsive: {
            0: {
                items: 1
            },
            480: {
                items: 2
            },
            768: {
                items: 3
            },
            992: {
                items: 4
            }
        }
    });

    //Menu Sticky
    $(".main-menu").sticky({ topSpacing: 0, bottomSpacing: 5 });

    //Video Popup
    //Magnific Popup
    $('.video-btn').magnificPopup({
        type: 'iframe',
        iframe: {
            markup: '<div class="mfp-iframe-scaler">' +
                '<div class="mfp-close"></div>' +
                '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>' +
                '</div>',
            patterns: {
                youtube: {
                    index: 'youtube.com/',
                    id: 'v=',
                    src: 'http://www.youtube.com/embed/%id%?autoplay=1'
                }
            },
            srcAction: 'iframe_src'
        }
    });

    //Preloader
    $(window).load(function () { // makes sure the whole site is loaded
        $('#box,#hill').fadeOut(); // will first fade out the loading animation
        $('#loader,.preloader').delay(100).fadeOut('fast'); // will fade out the white DIV that covers the website.
        $('body').delay(100).css({ 'overflow': 'visible' });
    })


})();