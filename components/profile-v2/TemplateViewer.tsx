"use client";

import { TemplateContent } from "@/types/profile-v2";
import { useEffect, useState, useCallback } from "react";

interface Props {
    data: TemplateContent;
    userId?: string;
}

const ProjectItemView = ({ project, resolveImageUrl }: { project: any, resolveImageUrl: any }) => {
    const [collageImages, setCollageImages] = useState<any[]>([]);
    const [caid, setCaid] = useState<string>("");

    useEffect(() => {
        if (project.galleryId && project.showAsCollage) {
            const fetchImages = async () => {
                try {
                    const res = await fetch(`/api/projects/${project.galleryId}`);
                    const pData = await res.json();
                    const p = pData.project;
                    if (p?.cloudAccountId && p?.rootFolderId) {
                        setCaid(p.cloudAccountId);
                        const fRes = await fetch(`/api/cloud/files?cloudAccountId=${p.cloudAccountId}&folderId=${p.rootFolderId}&projectId=${p.id}`);
                        const fData = await fRes.json();
                        if (fData.files) {
                            setCollageImages(fData.files.filter((f: any) => f.mimeType?.startsWith('image/')).slice(0, 3));
                        }
                    }
                } catch (e) { }
            };
            fetchImages();
        }
    }, [project.galleryId, project.showAsCollage]);

    const getThumb = (file: any) => {
        if (!caid || !file) return "";
        return `/api/cloud/thumbnail?c=${caid}&f=${file.id}&s=600`;
    };

    return (
        <figure className="position-relative mb-0" style={{ pointerEvents: 'none' }}>
            {project.showAsCollage && collageImages.length >= 2 ? (
                <div className="project-collage" onError={() => setCollageImages([])}>
                    <div style={{ gridRow: 'span 2' }}>
                        <img src={getThumb(collageImages[0])} alt="" onError={(e: any) => e.target.src = resolveImageUrl(project.image)} />
                    </div>
                    <div>
                        <img src={getThumb(collageImages[1])} alt="" onError={(e: any) => e.target.src = resolveImageUrl(project.image)} />
                    </div>
                    <div>
                        <img src={getThumb(collageImages[2] || collageImages[0])} alt="" onError={(e: any) => e.target.src = resolveImageUrl(project.image)} />
                    </div>
                </div>
            ) : (
                <img
                    alt=""
                    className="w-100 img-fluid"
                    src={project.image && project.image !== "/labs/img/portfolio/1140x641-1.jpg"
                        ? resolveImageUrl(project.image)
                        : (project.externalLink
                            ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(project.externalLink.startsWith('http') ? project.externalLink : `https://${project.externalLink}`)}?w=1140&h=641`
                            : resolveImageUrl(project.image))}
                    onError={(e: any) => {
                        e.target.src = "/labs/img/portfolio/1140x641-1.jpg";
                    }}
                />
            )}
            <figcaption className="text-white">
                <h3 className="mb-2 text-white">{project.title}</h3>
                <p>{project.category}</p>
            </figcaption>
        </figure>
    );
};

export function TemplateViewer({ data, userId }: Props) {
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingForm, setBookingForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', date: '', notes: '' });
    const [bookingSent, setBookingSent] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Calculate date bounds from cta settings
    const bookingWindowWeeks = (() => {
        const rw = data.cta?.reservationWindow || '4 Semanas';
        const n = parseInt(rw);
        return isNaN(n) ? 4 : n;
    })();
    const bookingLeadDays = data.cta?.minAnticipationDays || 0;

    const getMinDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + (bookingLeadDays || 1));
        return d.toISOString().split('T')[0];
    };
    const getMaxDate = () => {
        if (bookingWindowWeeks === 0) return undefined;
        const d = new Date();
        d.setDate(d.getDate() + (bookingWindowWeeks * 7));
        return d.toISOString().split('T')[0];
    };
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) { setBookingError('No se pudo identificar al profesional.'); return; }
        setBookingLoading(true);
        setBookingError(null);

        // Convert the "YYYY-MM-DD" local string to an ISO string representing local noon (12:00:00)
        // so it creates a visible block in calendar apps during the day instead of midnight
        const [y, m, d] = bookingForm.date.split('-');
        const localDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);

        try {
            const response = await fetch('/api/public/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    ...bookingForm,
                    date: localDate.toISOString() // explicitly send the ISO offset time
                }),
            });
            if (!response.ok) {
                const d = await response.json();
                throw new Error(d.error || 'Error al enviar la reserva');
            }
            setBookingSent(true);
        } catch (err: any) {
            setBookingError(err.message || 'No se pudo enviar la solicitud.');
        } finally {
            setBookingLoading(false);
        }
    };

    useEffect(() => {
        // Ejecutar Inicialización de animaciones y scripts de template una vez montado el DOM
        if (typeof window !== "undefined") {
            try {
                // @ts-ignore
                if (window.initTemplateScripts) {
                    setTimeout(() => {
                        // @ts-ignore
                        window.initTemplateScripts();
                    }, 300);
                }
            } catch (e) {
                console.error("Error initializing template scripts", e);
            }
        }
    }, [data]); // Re-ejecutar si la data cambia mucho

    const c = data.colors || {
        primary: "#23a592",
        bgDark: "#1d1d1d",
        bgLight: "#f5f5f5",
        bgWhite: "#ffffff",
        textDark: "#343434",
        textGray: "#767676",
        textWhite: "#ffffff",
        headerBorder: "#343434",
    };

    // Ensure headerBorder has a fallback even if colors object exists but is missing that key
    const headerBorderColor = c.headerBorder || "#343434";

    const hexToRgba = (hex: string, opacity: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const resolveImageUrl = (url?: string) => {
        if (!url) return "";
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/uploads/')) {
            return url;
        }
        return `/labs${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <div className="richard-template">
            <style>{`
                .project-item figure {
                    aspect-ratio: 1140 / 641 !important;
                    overflow: hidden !important;
                    background: #111 !important;
                    margin-bottom: 0 !important;
                }
                .project-item img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                .project-collage {
                    display: grid !important;
                    grid-template-columns: 2fr 1fr !important;
                    grid-template-rows: 1fr 1fr !important;
                    gap: 2px !important;
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
            {/* Dynamic Color overrides */}
            <style dangerouslySetInnerHTML={{
                __html: `
                /* Background Overrides */
                body, .bg-white { background-color: ${c.bgWhite} !important; }
                .bg-dark, .section.bg-dark, .navbar-nav-desctop li ul { background-color: ${c.bgDark} !important; }
                .bg-light, .section.bg-light, .row-experience:nth-child(even), .progress { background-color: ${c.bgLight} !important; }
                .bg-dark .row-experience:nth-child(even), .bg-dark .progress { background-color: ${c.bgDark} !important; filter: brightness(1.2); }

                /* Text Color Overrides */
                body, p, h1, h2, h3, h4, h5, h6, .text-dark { color: ${c.textDark} !important; border-color: ${c.textDark}; }
                .text-gray { color: ${c.textGray} !important; }
                .text-white, .bg-dark p, .bg-dark h1, .bg-dark h2, .bg-dark h3, .bg-dark h4, .bg-dark h5, .bg-dark h6, .navbar-brand { color: ${c.textWhite} !important; }
                
                /* Accent (Primary) Color Overrides */
                .text-primary, ion-icon { color: ${c.primary} !important; }
                .btn, .progress-bar:before, .owl-dot.active span, .experience-number.v2:before { background-color: ${c.primary} !important; border-color: ${c.primary} !important; color: ${c.textWhite} !important; }
                .btn:hover { color: ${c.textWhite} !important; background-color: ${hexToRgba(c.primary, 0.85)} !important; border-color: ${c.primary} !important; }
                .btn:active, .btn:focus { color: ${c.textWhite} !important; background-color: ${c.primary} !important; border-color: ${c.primary} !important; }
                
                /* Global Highlight & Scrollbar */
                ::-webkit-scrollbar-thumb { background: ${c.primary} !important; }
                ::selection { background-color: ${c.primary} !important; color: ${c.textWhite} !important; }
                ::-moz-selection { background-color: ${c.primary} !important; color: ${c.textWhite} !important; }

                .text-white-50 { color: ${c.textWhite} !important; opacity: 0.5; }

                /* Logo "Drip" Effect */
                .logo-container {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 0;
                    z-index: 1100;
                    pointer-events: none;
                }
                .navbar {
                    background-color: ${c.bgWhite} !important;
                    border-bottom: 1px solid ${headerBorderColor} !important;
                    box-shadow: none !important;
                }
                .logo-falling {
                    width: ${data.header.logoWidth || 120}px;
                    height: auto;
                    animation: logoFall 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    pointer-events: auto;
                }
                @keyframes logoFall {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(0); }
                }

                /* Section Specific Overrides - Higher Specificity */
                ${data.hero.titleColor ? `#home h1, #home h2, #home h3, #home h4, #home h5, #home h6 { color: ${data.hero.titleColor} !important; }` : ''}
                ${data.hero.descriptionColor ? `#home p, #home span, #home li { color: ${data.hero.descriptionColor} !important; }` : ''}
                
                ${data.about.titleColor ? `#about h1, #about h2, #about h3, #about h4, #about h5, #about h6 { color: ${data.about.titleColor} !important; }` : ''}
                ${data.about.descriptionColor ? `#about p, #about span, #about li, #about div { color: ${data.about.descriptionColor} !important; }` : ''}
                
                ${data.servicesConfig?.titleColor ? `.bg-dark h6, .bg-dark i, .bg-dark p, .bg-dark span { color: ${data.servicesConfig.titleColor} !important; }` : ''}
                
                ${data.experienceTitleColor ? `#experience h2 { color: ${data.experienceTitleColor} !important; }` : ''}
                ${data.experienceItemCompanyColor ? `#experience h5.text-primary.text-uppercase { color: ${data.experienceItemCompanyColor} !important; }` : ''}
                ${data.experienceItemRoleColor ? `#experience h5.mb-3 { color: ${data.experienceItemRoleColor} !important; }` : ''}
                ${data.experienceItemPeriodColor ? `#experience .h6.text-gray { color: ${data.experienceItemPeriodColor} !important; }` : ''}
                ${data.experienceItemDescriptionColor ? `#experience p { color: ${data.experienceItemDescriptionColor} !important; }` : ''}
                
                ${data.projectsTitleColor ? `#projects h2 { color: ${data.projectsTitleColor} !important; }` : ''}
                ${data.projectsItemTitleColor ? `#projects h3, #projects h3.text-white { color: ${data.projectsItemTitleColor} !important; }` : ''}
                ${data.projectsItemCategoryColor ? `#projects figcaption p { color: ${data.projectsItemCategoryColor} !important; }` : ''}
                
                ${data.testimonialsTitleColor ? `#testimonials h2, #testimonials p, #testimonials span, #testimonials strong { color: ${data.testimonialsTitleColor} !important; }` : ''}
                
                ${data.footer?.emailColor ? `footer h6, footer p, footer span { color: ${data.footer.emailColor} !important; }` : ''}
                ${data.footer?.socialLabelColor ? `footer h6:last-of-type { color: ${data.footer.socialLabelColor} !important; }` : ''}
                ${data.footer?.copyrightColor ? `.footer-copy, .footer-copy .container { color: ${data.footer.copyrightColor} !important; }` : ''}

                /* Header Navigation Custom Colors */
                ${data.header.navColor ? `
                    .navbar-desctop .navbar-nav-desctop > li > a, 
                    .navbar-desctop .navbar-nav-desctop > li > a:focus { 
                        color: ${data.header.navColor} !important; 
                    }
                ` : ''}
                    ${data.header.navHoverColor ? `
                        .navbar-desctop .navbar-nav-desctop > li > a:hover, 
                        .navbar-desctop .navbar-nav-desctop > li.active > a,
                        .navbar-desctop .navbar-nav-desctop > li:hover > a { 
                            color: ${data.header.navHoverColor} !important; 
                        }
                    ` : ''}

                    /* Hero Image Effects */
                    #home {
                        position: relative;
                        z-index: 1;
                        background-image: none !important;
                        overflow: hidden;
                        min-height: 100vh; /* FORZAR ALTURA COMPLETA PARA QUE EL BG SE VEA BIEN */
                        display: flex;
                        align-items: center;
                    }
                    #home::after {
                        content: "";
                        position: absolute;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        left: 0;
                        background-image: url('${data.hero.image ? resolveImageUrl(data.hero.image) : "/labs/img/bg/personal.jpg"}') !important;
                        background-position: ${data.hero.imagePositionX ?? 50}% ${data.hero.imagePositionY ?? 50}% !important;
                        background-size: ${data.hero.imageScale ? `${data.hero.imageScale}%` : 'cover'} !important;
                        background-repeat: no-repeat !important; /* EVITAR REPETICIÓN DE IMAGEN SI EL SCALING ES MENOR AL CONTENEDOR */
                        filter: brightness(${data.hero.imageBrightness ?? 1.0}) blur(${data.hero.imageBlur ?? 0}px) !important;
                        z-index: -1;
                        transition: opacity 0.3s ease;
                    }

                    /* Center Navigation Arrows Vertically */
                    .owl-nav {
                        position: absolute;
                        top: 50% !important;
                        width: 100%;
                        transform: translateY(-50%) !important;
                        pointer-events: none;
                        z-index: 10;
                    }

                    .owl-nav .owl-prev, 
                    .owl-nav .owl-next {
                        position: absolute !important;
                        top: 50% !important;
                        transform: translateY(-50%) !important;
                        font-size: 10rem !important;
                        line-height: 1 !important;
                        font-weight: 100 !important;
                        font-family: Arial, sans-serif !important; /* System font for thinner character */
                        color: #000 !important;
                        opacity: 0.15 !important; /* Always visible */
                        transition: all 0.3s ease !important;
                        background: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        pointer-events: auto;
                    }

                    .owl-nav .owl-prev {
                        left: -100px !important; /* Increased separation */
                    }

                    .owl-nav .owl-next {
                        right: -100px !important; /* Increased separation */
                    }

                    .owl-nav .owl-prev:hover, 
                    .owl-nav .owl-next:hover {
                        opacity: 1 !important;
                    }

                    /* Typography Upgrade to Lexend */
                    h1, h2, h3, h4, h5, h6, .display-4, .navbar-nav li a {
                        font-family: 'Lexend', sans-serif !important;
                        letter-spacing: -0.02em;
                    }

                    html, body {
                        overflow-x: hidden !important;
                        position: relative;
                        width: 100%;
                    }

                    body, p, .lead {
                        font-family: 'Lexend', sans-serif !important;
                    }

                    /* Hide Global Assistant on V2 Profiles */
                    .fixed.bottom-6.right-6 {
                        display: none !important;
                    }
                    #testimonials {
                        background-color: #fff !important;
                        padding-top: 120px !important;
                        padding-bottom: 120px !important;
                    }
                    .carousel-testimonials .col-testimonial {
                        position: relative;
                        padding: 6.2em 3.75em 0 3em;
                        text-align: left;
                    }
                    .carousel-testimonials .quiote {
                        position: absolute;
                        left: 0;
                        top: 0;
                        font-family: Georgia, "Times New Roman", Times, serif;
                        font-size: 13rem !important;
                        line-height: 1;
                        color: #000 !important;
                        opacity: 0.11 !important;
                        z-index: 0;
                        pointer-events: none;
                    }
                    .carousel-testimonials p {
                        position: relative;
                        z-index: 1;
                        font-size: 1.1rem !important;
                        line-height: 1.8 !important;
                        margin-bottom: 2rem;
                        color: #333 !important;
                    }
                    .carousel-testimonials strong {
                        color: #000 !important;
                        font-weight: 700 !important;
                    }
                    .carousel-testimonials .owl-dots {
                        margin-top: 50px !important;
                    }
                    .carousel-testimonials .owl-dot span {
                        width: 8px !important;
                        height: 8px !important;
                        margin: 5px 7px !important;
                        background: #d6d6d6 !important;
                    }
                    .carousel-testimonials .owl-dot.active span {
                        background: #000 !important;
                    }

                    /* Responsive Mobile Adjustments */
                    @media (max-width: 991px) {
                        #home::after {
                            background-size: cover !important;
                            background-position: center center !important;
                        }
                        .menu-is-open .toggler {
                            z-index: 1070 !important;
                            opacity: 1 !important;
                            color: #fff !important;
                        }
                    }

                    .mobile-nav-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: #000000e6;
                        backdrop-filter: blur(10px);
                        z-index: 1065;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s ease;
                    }
                    .menu-is-open .mobile-nav-overlay {
                        opacity: 1;
                        pointer-events: auto;
                    }

                    /* Responsive Desktop Adjustments */
                    @media (min-width: 992px) {
                        .hero-desktop-offset {
                            margin-left: -200px !important;
                            max-width: 600px !important;
                        }
                        .about-desktop-offset {
                            margin-left: -200px !important;
                            width: calc(100% + 400px) !important;
                        }
                        .about-desktop-title-offset {
                            margin-left: 150px !important;
                        }
                        .services-desktop-offset {
                            transform: translate(${data.servicesConfig?.offsetLeft || 0}px, ${-(data.servicesConfig?.offsetTop || 0)}px) !important;
                            width: calc(100% + ${data.servicesConfig?.widthAddition || 0}px) !important;
                        }
                    }
                `


            }} />

            {/* Navbar */}
            <nav id="scrollspy" className="navbar navbar-desctop navbar-white fixed px-0" style={{ borderBottomColor: headerBorderColor, borderBottomWidth: '1px', borderBottomStyle: 'solid', boxShadow: 'none' }}>
                <div className="container-fluid px-4 overflow-visible">
                    <div className="d-flex position-relative w-100 align-items-center justify-content-between overflow-visible">
                        {/* Logo Falling Container - Now allowed to go full width */}
                        {data.header.logoImage && (
                            <div
                                className="logo-container d-none d-lg-block"
                                style={{
                                    left: `${data.header.logoCenter || 0}%`,
                                    transform: 'translateX(-50%)',
                                    position: 'absolute',
                                    top: 0,
                                    zIndex: 1050,
                                    pointerEvents: 'none'
                                }}
                            >
                                <div className="logo-falling" style={{ pointerEvents: 'auto' }}>
                                    <img src={resolveImageUrl(data.header.logoImage)} alt="Logo" className="img-fluid" />
                                </div>
                            </div>
                        )}

                        <a className="navbar-brand" href="#" style={{ zIndex: 1060 }}>
                            {data.header.logoImage ? (
                                <img src={resolveImageUrl(data.header.logoImage)} alt="Logo" style={{ height: '45px', marginRight: '10px' }} className="d-lg-none" />
                            ) : data.header.logoText}
                        </a>

                        <ul className="navbar-nav-desctop mr-auto d-none d-lg-block" style={{ marginLeft: '150px' }}>
                            {data.header.navigation
                                .filter(nav => nav.visible !== false)
                                .map((nav, index) => (
                                    <li key={index}><a className="nav-link" href={nav.url} onClick={(e) => {
                                        if (nav.url.startsWith('#')) {
                                            e.preventDefault();
                                            const target = document.querySelector(nav.url);
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth' });
                                                // Close mobile menu if open
                                                document.body.classList.remove('menu-is-open');
                                                document.body.classList.add('menu-is-closed');
                                            }
                                        }
                                    }}>{nav.label}</a></li>
                                ))}
                        </ul>

                        {/* Social - Pushed to the right */}
                        <ul className="social-icons d-none d-sm-flex align-items-center mb-0 list-unstyled gap-1" style={{ zIndex: 1060 }}>
                            {data.header.socials.map((social, index) => {
                                const iconClass = social.icon.includes('fa-') ? social.icon : `fa-brands fa-${social.icon}`;
                                return (
                                    <li key={index}>
                                        <a href={social.url} target="_blank" rel="noopener noreferrer">
                                            <i className={iconClass}></i>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Toggler */}
                        <button
                            className="toggler d-lg-none ml-auto"
                            onClick={(e) => {
                                e.preventDefault();
                                document.body.classList.toggle('menu-is-open');
                            }}
                        >
                            <span className="toggler-icon"></span>
                            <span className="toggler-icon"></span>
                            <span className="toggler-icon"></span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation Overlay */}
            <div className="mobile-nav-overlay d-lg-none">
                <ul className="mb-0 list-unstyled text-center p-0">
                    {data.header.navigation
                        .filter((nav) => nav.visible !== false)
                        .map((nav, index) => (
                            <li key={index} className="mb-4">
                                <a
                                    href={nav.url}
                                    style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
                                    onClick={(e) => {
                                        if (nav.url.startsWith('#')) {
                                            e.preventDefault();
                                            const target = document.querySelector(nav.url);
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }
                                        document.body.classList.remove('menu-is-open');
                                    }}
                                >
                                    {nav.label}
                                </a>
                            </li>
                        ))}
                </ul>
                <ul className="social-icons d-flex align-items-center mt-5 list-unstyled gap-3" style={{ zIndex: 1060 }}>
                    {data.header.socials.map((social, index) => {
                        const iconClass = social.icon.includes('fa-') ? social.icon : `fa-brands fa-${social.icon}`;
                        return (
                            <li key={index}>
                                <a href={social.url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: '1.5rem' }}>
                                    <i className={iconClass}></i>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Hero Section */}
            {data.hero.visible !== false && (
                <main id="home" className="masthead" role="main">
                    <div className="opener">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <div
                                        className="hero-content-box p-4 p-md-5 rounded-3 hero-desktop-offset"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                            backdropFilter: 'blur(5px)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            width: '100%'
                                        }}
                                        data-aos="fade-up"
                                    >
                                        <h1 className="display-4 fw-bold text-uppercase" style={{ fontSize: '2.5rem', color: data.hero.titleColor || '#FFFFFF' }}>{data.hero.heading}</h1>

                                        <p
                                            className="lead mt-4 mb-5"
                                            style={{
                                                fontSize: '1.25rem',
                                                lineHeight: '1.8',
                                                fontWeight: '400',
                                                whiteSpace: 'pre-wrap',
                                                maxWidth: '100%',
                                                textAlign: 'justify',
                                                hyphens: 'none',
                                                wordBreak: 'normal',
                                                overflowWrap: 'break-word',
                                                color: data.hero.descriptionColor || '#E6E6E6'
                                            }}
                                        >
                                            {data.hero.description}
                                        </p>
                                        {data.cta?.buttonVisible !== false && (
                                            <button type="button" className="btn btn-lg" onClick={() => setShowBookingModal(true)}>
                                                {data.hero.buttonText}
                                            </button>
                                        )}

                                        {/* Skills / Habilidades */}
                                        {data.about.skills && data.about.skills.length > 0 && (
                                            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <h6 className="text-uppercase fw-bold mb-4" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', opacity: 0.6 }}>Habilidades</h6>
                                                <div className="row">
                                                    {data.about.skills.map((skill, sIdx) => (
                                                        <div key={sIdx} className="col-md-6 mb-3">
                                                            <div className="d-flex justify-content-between mb-1">
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{skill.name}</span>
                                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{skill.percentage}%</span>
                                                            </div>
                                                            <div className="progress" style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                                                <div
                                                                    className="progress-bar"
                                                                    role="progressbar"
                                                                    style={{ width: `${skill.percentage}%`, backgroundColor: c.primary, transition: 'width 1s ease' }}
                                                                    aria-valuenow={skill.percentage}
                                                                    aria-valuemin={0}
                                                                    aria-valuemax={100}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}


            {/* About Section */}
            {data.about.visible !== false && (
                <section id="about" className="section pb-5" style={{ paddingTop: '166px' }}>
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div
                                    className="about-content-box p-4 p-md-4 rounded-3 about-desktop-offset"
                                    style={{
                                        backgroundColor: 'rgba(0,0,0,0.03)',
                                        border: '1px solid rgba(0,0,0,0.05)'
                                    }}
                                    data-aos="fade-up"
                                >
                                    <h1 className="display-4 fw-bold text-uppercase about-desktop-title-offset">{data.about.title}</h1>
                                    <p
                                        className="lead mt-4 mb-0"
                                        style={{
                                            fontSize: '1.25rem',
                                            lineHeight: '1.8',
                                            fontWeight: '400',
                                            whiteSpace: 'pre-wrap',
                                            maxWidth: '100%',
                                            textAlign: 'justify',
                                            hyphens: 'none',
                                            wordBreak: 'normal',
                                            overflowWrap: 'break-word',
                                            color: undefined
                                        }}
                                    >
                                        {data.about.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Services Section */}
            {data.servicesConfig?.visible !== false && (
                <section className="bg-dark overflow-hidden" style={{ paddingTop: '1rem', paddingBottom: 'calc(3rem + 10px)' }}>
                    <div className="container">
                        <div className="row services-desktop-offset">
                            {data.services?.map((service, index) => (
                                <div key={index} className="col-md-4 mb-4 mb-md-0" data-aos="fade-up" data-aos-delay={index * 100}>
                                    {service.image ? (
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            paddingTop: `${service.imageOffsetTop || 0}px`,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            transform: `translateX(${service.imageOffsetLeft || 0}px)`
                                        }}>
                                            <img
                                                src={resolveImageUrl(service.image)}
                                                alt={service.title}
                                                style={{
                                                    width: `${service.imageWidth || 80}px`,
                                                    height: 'auto'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <i className={service.icon} style={{ fontSize: '3.8rem', marginBottom: '1.5rem', display: 'block' }}></i>
                                    )}
                                    <h6 className="mt-1">{service.title}</h6>
                                    <p className="text-white-50" style={{ textAlign: 'justify', hyphens: 'none' }}>{service.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Experience Section */}
            {data.experienceVisible !== false && (
                <section id="experience" className="section pb-0">
                    <div className="container">
                        <div className="row align-items-end">
                            <div className="col-md-6" data-aos="fade-up"><h2 className="mb-3 mb-md-0">{data.experienceTitle}</h2></div>
                        </div>
                        <div className="mt-5 pt-5">
                            {data.experience.map((exp, index) => (
                                <div key={index} className="row-experience row justify-content-between" data-aos="fade-up">
                                    <div className="col-md-4">
                                        <div className="h6 my-0 text-gray">{exp.years}</div>
                                        <h5 className="mt-2 text-primary text-uppercase">{exp.company}</h5>
                                    </div>
                                    <div className="col-md-4">
                                        <h5 className="mb-3 mt-0 text-uppercase">{exp.role}</h5>
                                    </div>
                                    <div className="col-md-4">
                                        <p>{exp.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Projects Section */}
            {data.projectsVisible !== false && (
                <section id="projects" className="section">
                    <div className="container">
                        <div className="row align-items-end">
                            <div className="col-md-6" data-aos="fade-up"><h2 className="mb-3 mb-md-0">{data.projectsTitle}</h2></div>
                        </div>
                        <div className="mt-5 pt-5" data-aos="fade-in">
                            <div className="carousel-project owl-carousel owl-theme" key={JSON.stringify(data.projects)}>
                                {data.projects?.map((project, index) => {
                                    const hasGallery = !!project.galleryId;
                                    const hasExternal = !!project.externalLink;
                                    // Use slug if available, fallback to ID if it exists, otherwise use modal link
                                    const galleryLink = project.gallerySlug ? `/g/${project.gallerySlug}` : (project.galleryId ? `/g/${project.galleryId}` : null);
                                    const targetLink = galleryLink || (hasExternal ? project.externalLink : `#${project.id}`);
                                    const isExternal = hasExternal && !galleryLink;
                                    const isModal = !galleryLink && !hasExternal;
                                    const openInNewTab = !!galleryLink || hasExternal;

                                    return (
                                        <div key={index} className="project-item">
                                            <a
                                                href={targetLink}
                                                className={isModal ? "popup-with-zoom-anim" : ""}
                                                target={openInNewTab ? "_blank" : "_self"}
                                                rel={openInNewTab ? "noopener noreferrer" : ""}
                                            >
                                                <ProjectItemView project={project} resolveImageUrl={resolveImageUrl} />
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Project Modals */}
            {data.projects?.map((project, index) => (
                <div key={index} id={project.id} className="container mfp-hide zoom-anim-dialog">
                    <h2 className="mt-0">{project.title}</h2>
                    <div className="section-project-details padding-modal">
                        <div className="row">
                            {project.details.clients && (
                                <div className="col-md-6 col-lg-3">
                                    <h6 className="my-0">Client:</h6>
                                    <span>{project.details.clients}</span>
                                </div>
                            )}
                            {project.details.completion && (
                                <div className="col-md-6 col-lg-3">
                                    <h6 className="my-0">Date:</h6>
                                    <span>{project.details.completion}</span>
                                </div>
                            )}
                            {project.details.role && (
                                <div className="col-md-6 col-lg-3">
                                    <h6 className="my-0">Role:</h6>
                                    <span>{project.details.role}</span>
                                </div>
                            )}
                            {project.details.authors && (
                                <div className="col-md-6 col-lg-3">
                                    <h6 className="my-0">Authors:</h6>
                                    <span>{project.details.authors}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {project.details.detailImage && (
                        <img alt="" className="mt-5 pt-2 w-100" src={resolveImageUrl(project.details.detailImage)} />
                    )}
                </div>
            ))}

            {/* Testimonials Section */}
            {data.testimonialsVisible !== false && (
                <section id="testimonials" className="testimonials section">
                    <div className="container">
                        <div className="carousel-testimonials owl-carousel owl-theme" key={JSON.stringify(data.testimonials)}>
                            {data.testimonials?.map((testi, index) => (
                                <div key={index} className="col-testimonial" data-aos="fade-up">
                                    <span className="quiote">“</span>
                                    <p data-aos="fade-up">{testi.quote}</p>
                                    <p className="mt-5 text-dark" data-aos="fade-up"><strong>{testi.author}</strong> - {testi.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            < footer >
                <div className="section bg-dark py-5 pb-0">
                    <div className="container">
                        <div className="row">
                            <div className="col-md-6 col-lg-3">
                                <h6 className="mb-4">Email:</h6>
                                <p className="mb-4">{data.footer?.email}</p>
                            </div>
                            <div className="col-md-6 col-lg-3 ml-md-auto text-md-right">
                                <h6 className="mb-4">{data.footer?.socialLabel}</h6>
                                <ul className="social-icons d-flex list-unstyled gap-1 justify-content-md-end">

                                    {data.header.socials.map((social, index) => {
                                        const iconClass = social.icon.includes('fa-') ? social.icon : `fa-brands fa-${social.icon}`;
                                        return (
                                            <li key={index}><a href={social.url} target="_blank" rel="noopener noreferrer"><i className={iconClass}></i></a></li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footer-copy section-sm">
                    <div className="container">{data.footer?.copyrightText}</div>
                </div>
            </footer >

            {/* Booking Modal */}
            {showBookingModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setShowBookingModal(false); setBookingSent(false); setBookingError(null); } }}
                >
                    <div
                        style={{
                            backgroundColor: c.bgWhite, color: '#111827', borderRadius: '24px',
                            padding: '1.5rem', width: '95%', maxWidth: '460px',
                            maxHeight: '95vh', overflowY: 'auto',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                            position: 'relative',
                        }}
                    >
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                .booking-modal-override h4, .booking-modal-override p {
                                    color: #111827 !important;
                                }
                                .booking-modal-override p.text-muted-override {
                                    color: #4B5563 !important;
                                }
                                .booking-form-input::-webkit-calendar-picker-indicator {
                                    opacity: 1;
                                    cursor: pointer;
                                    filter: invert(0.2) sepia(0) saturate(1) hue-rotate(0deg) brightness(0.2) contrast(1);
                                }
                                .booking-form-input {
                                    color-scheme: light;
                                }
                            `
                        }} />

                        <button
                            onClick={() => { setShowBookingModal(false); setBookingSent(false); setBookingError(null); }}
                            style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                background: 'none', border: 'none', fontSize: '1.5rem',
                                cursor: 'pointer', color: '#6B7280', lineHeight: 1,
                            }}
                        >
                            &times;
                        </button>

                        {bookingSent ? (
                            <div className="booking-modal-override" style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: `${c.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: c.primary }}>✓</div>
                                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.2rem' }}>¡Solicitud enviada!</h4>
                                <p className="text-muted-override" style={{ fontSize: '0.85rem', marginBottom: '2rem' }}>Hemos notificado al profesional. Te contactará pronto al correo o WhatsApp proporcionado.</p>
                                <button
                                    onClick={() => { setShowBookingModal(false); setBookingSent(false); setBookingForm({ customerName: '', customerEmail: '', customerPhone: '', date: '', notes: '' }); }}
                                    style={{ backgroundColor: '#111827', color: '#FFFFFF', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                    className="bg-gray-900 text-white hover:bg-gray-800 transition"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <div className="booking-modal-override">
                                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1.15rem' }}>{data.hero.buttonText || 'Agendar una Cita'}</h4>
                                <p className="text-muted-override" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>Completa tus datos para enviar una solicitud.</p>


                                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem', color: '#4B5563' }}>Tu Nombre</label>
                                        <input
                                            type="text" required
                                            value={bookingForm.customerName}
                                            onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                                            style={{ width: '100%', padding: '0.7rem 1rem', border: `1px solid #D1D5DB`, borderRadius: '12px', outline: 'none', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#111827' }}
                                            placeholder="Nombre completo"
                                            className="booking-form-input placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem', color: '#4B5563' }}>Tu Email</label>
                                        <input
                                            type="email" required
                                            value={bookingForm.customerEmail}
                                            onChange={(e) => setBookingForm({ ...bookingForm, customerEmail: e.target.value })}
                                            style={{ width: '100%', padding: '0.7rem 1rem', border: `1px solid #D1D5DB`, borderRadius: '12px', outline: 'none', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#111827' }}
                                            placeholder="correo@ejemplo.com"
                                            className="booking-form-input placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem', color: '#4B5563' }}>Tu Teléfono (WhatsApp)</label>
                                        <input
                                            type="tel" required
                                            value={bookingForm.customerPhone}
                                            onChange={(e) => setBookingForm({ ...bookingForm, customerPhone: e.target.value })}
                                            style={{ width: '100%', padding: '0.7rem 1rem', border: `1px solid #D1D5DB`, borderRadius: '12px', outline: 'none', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#111827' }}
                                            placeholder="+52 55 1234 5678"
                                            className="booking-form-input placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem', color: '#4B5563' }}>Fecha deseada</label>
                                        <input
                                            type="date" required
                                            min={minDate}
                                            max={maxDate}
                                            value={bookingForm.date}
                                            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                            style={{ width: '100%', padding: '0.7rem 1rem', border: `1px solid #D1D5DB`, borderRadius: '12px', outline: 'none', fontSize: '0.9rem', backgroundColor: '#FFFFFF', color: '#111827' }}
                                            className="booking-form-input placeholder:text-gray-400"
                                        />
                                        {bookingWindowWeeks > 0 && (
                                            <p style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                Solo se permiten reservas hasta con {bookingWindowWeeks} sem. de anticipación.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.3rem', color: '#4B5563' }}>Notas / Detalles</label>
                                        <textarea
                                            value={bookingForm.notes}
                                            onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                            style={{ width: '100%', padding: '0.7rem 1rem', border: `1px solid #D1D5DB`, borderRadius: '12px', outline: 'none', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical', backgroundColor: '#FFFFFF', color: '#111827' }}
                                            placeholder="Cuéntanos sobre tu proyecto..."
                                            className="booking-form-input placeholder:text-gray-400"
                                        />
                                    </div>

                                    {/* Disclaimer */}
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', fontSize: '0.75rem', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                                        <span><strong>Nota:</strong> Esta solicitud es provisional. La fecha y hora exacta de tu cita se confirmará vía WhatsApp o llamada telefónica.</span>
                                    </div>

                                    {bookingError && (
                                        <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '8px' }}>{bookingError}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={bookingLoading}
                                        style={{
                                            width: '100%', padding: '0.85rem', borderRadius: '12px', cursor: bookingLoading ? 'not-allowed' : 'pointer',
                                            fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            backgroundColor: c.primary, color: c.textWhite, border: 'none',
                                            opacity: bookingLoading ? 0.7 : 1, marginTop: '0.25rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        }}
                                    >
                                        {bookingLoading && (
                                            <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: c.textWhite, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        )}
                                        {bookingLoading ? 'Enviando...' : 'Enviar Solicitud'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}

