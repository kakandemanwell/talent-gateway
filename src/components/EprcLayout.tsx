import { useState } from "react";

interface EprcLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function EprcLayout({ children, pageTitle = "Careers" }: EprcLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenuSection = (section: string) => {
    setExpandedMenu((current) => (current === section ? null : section));
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setExpandedMenu(null);
  };

  return (
    <div id="page" className="site">

      {/* Top contact bar */}
      <div className="subheader fixed">
        <div className="content">
          <div className="page-container top-part">
            <ul className="-left -unlist">
              <li className="item">+256-414-541-023/4</li>
              <li className="item">eprc@eprcug.org</li>
              <li className="item">Plot 51, Pool Road, Makerere, Kampala</li>
            </ul>
            <ul className="-right -unlist"></ul>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        id="masthead"
        className="header header-1 subheader_included extended-menu -sticky showed"
        data-header-fixed="true"
        data-mobile-header-fixed="true"
        data-fixed-initial-offset="150"
      >
        <div className="header-wrap page-container">
          <div className="header-wrap-inner">
            <div className="left-part">
              <div className="mobile-hamburger -left">
                <button
                  className="hamburger-button"
                  aria-label="Hamburger"
                  onClick={() => {
                    setMobileMenuOpen((open) => {
                      if (open) {
                        setExpandedMenu(null);
                      }

                      return !open;
                    });
                  }}
                >
                  <div className="hamburger icon-button" tabIndex={0}>
                    <i className="icon"></i>
                  </div>
                </button>
              </div>
              <div className="branding">
                <a className="branding-title titles-typo -undash -unlink" href="https://eprcug.org/" rel="home noreferrer" target="_blank">
                  <div className="logo-sticky" style={{ display: "flex" }}>
                    <img
                      src="https://eprcug.org/wp-content/uploads/2020/08/logo.png"
                      alt="Economic Policy Research Centre"
                    />
                  </div>
                </a>
              </div>
            </div>

            <div className="right-part">
              <nav
                id="site-navigation"
                className={`nav with-multi-level-indicators with-highlighted-menu hide-mobile-menu-images hide-mobile-menu-descriptions${mobileMenuOpen ? " opened" : ""}`}
              >
                <div className={`slide-in-overlay menu-slide-in-overlay${mobileMenuOpen ? " opened" : ""}`}>
                  <div className="overlay" onClick={closeMobileMenu}></div>
                  <div className="close-bar">
                    <button
                      className="icon-button -overlay-button"
                      aria-label="Close"
                      onClick={closeMobileMenu}
                    >
                      <i className="icon">
                        <svg className="default" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
                        </svg>
                      </i>
                    </button>
                  </div>
                  <div className="holder">
                    <div id="mega-menu-wrap" className="nav-container">
                      <div id="mega-menu-wrap-primary" className="mega-menu-wrap">
                        <ul id="mega-menu-primary" className="mega-menu max-mega-menu mega-menu-horizontal">

                          <li className="mega-menu-item mega-align-bottom-left mega-menu-flyout">
                            <a className="mega-menu-link" href="https://eprcug.org/" target="_blank" rel="noreferrer">Home</a>
                          </li>

                          <li className="mega-menu-item mega-align-bottom-left mega-menu-megamenu">
                            <a className="mega-menu-link" href="https://eprcug.org/publication/" target="_blank" rel="noreferrer">Publications</a>
                          </li>

                          <li className="mega-menu-item mega-align-bottom-left mega-menu-megamenu">
                            <a className="mega-menu-link" href="https://eprcug.org/research/" target="_blank" rel="noreferrer">Research</a>
                          </li>

                          <li className={`mega-menu-item mega-menu-item-has-children mega-align-bottom-left mega-menu-megamenu${expandedMenu === "projects" ? " expanded" : ""}`}>
                            <div className="mega-menu-trigger-row">
                              <a className="mega-menu-link" href="https://eprcug.org/projects/" target="_blank" rel="noreferrer">
                                PROJECTS
                              </a>
                              <button
                                type="button"
                                className="mega-submenu-toggle"
                                aria-expanded={expandedMenu === "projects"}
                                aria-label="Toggle Projects submenu"
                                onClick={() => toggleMenuSection("projects")}
                              >
                                <span className="mega-indicator" aria-hidden="true"></span>
                              </button>
                            </div>
                            <ul className="mega-sub-menu">
                              <li style={{ "--columns": "3", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/projects/new-projects/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>New Projects</a>
                              </li>
                              <li style={{ "--columns": "3", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/projects/ongoing-projects/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Ongoing Projects</a>
                              </li>
                              <li style={{ "--columns": "3", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/projects/completed-projects/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Completed Projects</a>
                              </li>
                            </ul>
                          </li>

                          <li className="mega-menu-item mega-align-bottom-left mega-menu-flyout">
                            <a className="mega-menu-link" href="https://eprcug.org/blogs/" target="_blank" rel="noreferrer">Blogs</a>
                          </li>

                          <li className={`mega-menu-item mega-menu-item-has-children mega-align-bottom-left mega-menu-megamenu${expandedMenu === "media-centre" ? " expanded" : ""}`}>
                            <div className="mega-menu-trigger-row">
                              <a className="mega-menu-link" href="https://eprcug.org/media-centre/" target="_blank" rel="noreferrer">
                                MEDIA CENTRE
                              </a>
                              <button
                                type="button"
                                className="mega-submenu-toggle"
                                aria-expanded={expandedMenu === "media-centre"}
                                aria-label="Toggle Media Centre submenu"
                                onClick={() => toggleMenuSection("media-centre")}
                              >
                                <span className="mega-indicator" aria-hidden="true"></span>
                              </button>
                            </div>
                            <ul className="mega-sub-menu">
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/eprc-highlights/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>EPRC Highlights</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/eprc-in-the-news/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>EPRC In The News</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/press-releases/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Press Releases</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/gallery/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Gallery</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://www.youtube.com/@EprcugOrgUganda/videos" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Videos</a>
                              </li>
                            </ul>
                          </li>

                          <li className={`mega-menu-item mega-current-menu-ancestor mega-menu-item-has-children mega-align-bottom-left mega-menu-megamenu${expandedMenu === "about" ? " expanded" : ""}`}>
                            <div className="mega-menu-trigger-row">
                              <a className="mega-menu-link" href="https://eprcug.org/about/" target="_blank" rel="noreferrer">
                                ABOUT
                              </a>
                              <button
                                type="button"
                                className="mega-submenu-toggle"
                                aria-expanded={expandedMenu === "about"}
                                aria-label="Toggle About submenu"
                                onClick={() => toggleMenuSection("about")}
                              >
                                <span className="mega-indicator" aria-hidden="true"></span>
                              </button>
                            </div>
                            <ul className="mega-sub-menu">
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/board-of-directors/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Board of Directors</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/eprc-management/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>EPRC Management</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/staff/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Staff</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/eprc-partners/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>EPRC Partners</a>
                              </li>
                              <li className="mega-current-menu-item" style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/careers/" target="_blank" rel="noreferrer" aria-current="page" onClick={closeMobileMenu}>Careers</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/opportunities/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Opportunities</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/procurements/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>Procurements</a>
                              </li>
                              <li style={{ "--columns": "5", "--span": "1" } as React.CSSProperties}>
                                <a className="mega-menu-link" href="https://eprcug.org/faqs/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>FAQs</a>
                              </li>
                            </ul>
                          </li>

                          <li className="mega-menu-item mega-align-bottom-left mega-menu-flyout">
                            <a className="mega-menu-link" href="https://eprcug.org/contact/" target="_blank" rel="noreferrer">Contact</a>
                          </li>

                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </nav>

              <ul className="menu-optional -unlist">
                <li className="icon-button-holder vc_hidden-xs">
                  <button className="icon-button search-global" aria-label="Search">
                    <i className="icon">
                      <svg className="default" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                        <path d="m779-128.5-247.979-248Q501.5-352.5 463-339.25T381.658-326q-106.132 0-179.645-73.454t-73.513-179.5Q128.5-685 201.954-758.5q73.454-73.5 179.5-73.5T561-758.487q73.5 73.513 73.5 179.645 0 42.842-13.5 81.592T584-429l248 247.5-53 53ZM381.5-401q74.5 0 126.25-51.75T559.5-579q0-74.5-51.75-126.25T381.5-757q-74.5 0-126.25 51.75T203.5-579q0 74.5 51.75 126.25T381.5-401Z" />
                      </svg>
                    </i>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Site content */}
      <div id="content" className="site-content" data-mobile-menu-resolution="768">
        <div className="header-cap subheader_included"></div>

        {/* Hero banner */}
        <div className="page-headline subheader_included -left">
          <div className="bg-image"></div>
          <div className="holder">
            <div className="page-container -full-w">
              <div className="animated-holder">
                <div className="headline-meta"></div>
                <h1 className="title">{pageTitle}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="page-container top-offset -full-w bottom-offset">
          <div id="primary" className="content-area">
            <div className="page-content">
              <main id="main" className="site-main">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer id="colophon" className="site-footer clb__light_section">
        <div className="page-container">
          <div className="widgets vc_row">

            {/* Col 1 — Logo + description */}
            <div className="vc_col-md-3 vc_col-sm-6 widgets-column">
              <ul>
                <li className="widget widget_block widget_media_image">
                  <figure className="wp-block-image size-full is-resized">
                    <img
                      src="https://eprcug.org/wp-content/uploads/2025/07/EPRC-Logo-White.png"
                      alt="EPRC"
                      style={{ width: "150px" }}
                    />
                  </figure>
                </li>
                <li className="widget widget_block widget_text">
                  <p>
                    EPRC is a reputable, credible and independent policy think tank in Uganda renowned for providing
                    research based evidence and policy analysis to support the formulation, implementation, monitoring
                    and evaluation of government policies.
                  </p>
                </li>
              </ul>
            </div>

            {/* Col 2 — Our Work links */}
            <div className="vc_col-md-3 vc_col-sm-6 widgets-column">
              <ul>
                <li className="widget widget_block"><h6 className="wp-block-heading footer-section-heading">OUR WORK</h6></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/publications/annual-reports/" target="_blank" rel="noreferrer">Annual Reports</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/publications/books" target="_blank" rel="noreferrer">Books/Book Chapters</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/publications/policy-notes/" target="_blank" rel="noreferrer">Policy Notes</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/publication/" target="_blank" rel="noreferrer">Publications</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/research/" target="_blank" rel="noreferrer">Research &amp; Data</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/publication/impact-stories/" target="_blank" rel="noreferrer">Impact Stories</a></p></li>
                <li className="widget widget_block widget_text"><p><a href="https://eprcug.org/media-centre/" target="_blank" rel="noreferrer">News &amp; Media</a></p></li>
              </ul>
            </div>

            {/* Col 3 — Contact + Social */}
            <div className="vc_col-md-3 vc_col-sm-6 widgets-column">
              <ul>
                <li className="widget widget_ohio_widget_contact">
                  <h3 className="title widget-title footer-section-heading">CONTACT INFO</h3>
                  <ul className="list-box contact-module">
                    <li>Phone: <address>+256-414-541-023/4</address></li>
                    <li>Email: <address>eprc@eprcug.org</address></li>
                    <li>Address: <address>Plot 51, Pool Road, Makerere University</address></li>
                  </ul>
                </li>
                <li className="widget widget_block"><h6 className="wp-block-heading footer-section-heading">FOLLOW US</h6></li>
                <li className="widget widget_block">
                  <ul className="wp-block-social-links is-layout-flex wp-block-social-links-is-layout-flex">
                    <li className="wp-social-link wp-social-link-facebook wp-block-social-link">
                      <a href="https://www.facebook.com/EPRCUganda/" className="wp-block-social-link-anchor" target="_blank" rel="noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                          <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z" />
                        </svg>
                        <span className="wp-block-social-link-label screen-reader-text">Facebook</span>
                      </a>
                    </li>
                    <li className="wp-social-link wp-social-link-x wp-block-social-link">
                      <a href="https://twitter.com/EPRC_official" className="wp-block-social-link-anchor" target="_blank" rel="noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                          <path d="M13.982 10.622 20.54 3h-1.554l-5.693 6.618L8.745 3H3.5l6.876 10.007L3.5 21h1.554l6.012-6.989L15.868 21h5.245l-7.131-10.378Zm-2.128 2.474-.697-.997-5.543-7.93H8l4.474 6.4.697.996 5.815 8.318h-2.387l-4.745-6.787Z" />
                        </svg>
                        <span className="wp-block-social-link-label screen-reader-text">X</span>
                      </a>
                    </li>
                    <li className="wp-social-link wp-social-link-linkedin wp-block-social-link">
                      <a href="https://ug.linkedin.com/company/economic-policy-research-centre" className="wp-block-social-link-anchor" target="_blank" rel="noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                          <path d="M19.7,3H4.3C3.582,3,3,3.582,3,4.3v15.4C3,20.418,3.582,21,4.3,21h15.4c0.718,0,1.3-0.582,1.3-1.3V4.3 C21,3.582,20.418,3,19.7,3z M8.339,18.338H5.667v-8.59h2.672V18.338z M7.004,8.574c-0.857,0-1.549-0.694-1.549-1.548 c0-0.855,0.691-1.548,1.549-1.548c0.854,0,1.547,0.694,1.547,1.548C8.551,7.881,7.858,8.574,7.004,8.574z M18.339,18.338h-2.669 v-4.177c0-0.996-0.017-2.278-1.387-2.278c-1.389,0-1.601,1.086-1.601,2.206v4.249h-2.667v-8.59h2.559v1.174h0.037 c0.356-0.675,1.227-1.387,2.526-1.387c2.703,0,3.203,1.779,3.203,4.092V18.338z" />
                        </svg>
                        <span className="wp-block-social-link-label screen-reader-text">LinkedIn</span>
                      </a>
                    </li>
                    <li className="wp-social-link wp-social-link-youtube wp-block-social-link">
                      <a href="https://www.youtube.com/c/EprcugOrgUganda" className="wp-block-social-link-anchor" target="_blank" rel="noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                          <path d="M21.8,8.001c0,0-0.195-1.378-0.795-1.985c-0.76-0.797-1.613-0.801-2.004-0.847c-2.799-0.202-6.997-0.202-6.997-0.202 h-0.009c0,0-4.198,0-6.997,0.202C4.608,5.216,3.756,5.22,2.995,6.016C2.395,6.623,2.2,8.001,2.2,8.001S2,9.62,2,11.238v1.517 c0,1.618,0.2,3.237,0.2,3.237s0.195,1.378,0.795,1.985c0.761,0.797,1.76,0.771,2.205,0.855c1.6,0.153,6.8,0.201,6.8,0.201 s4.203-0.006,7.001-0.209c0.391-0.047,1.243-0.051,2.004-0.847c0.6-0.607,0.795-1.985,0.795-1.985s0.2-1.618,0.2-3.237v-1.517 C22,9.62,21.8,8.001,21.8,8.001z M9.935,14.594l-0.001-5.62l5.404,2.82L9.935,14.594z" />
                        </svg>
                        <span className="wp-block-social-link-label screen-reader-text">YouTube</span>
                      </a>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* Col 4 — Newsletter */}
            <div className="vc_col-md-3 vc_col-sm-6 widgets-column">
              <div className="widget">
                <h3 className="title widget-title footer-section-heading">NEWSLETTER SIGNUP</h3>
                <form action="https://eprcug.org/newsletter" method="post" target="_blank" rel="noreferrer">
                  <div className="inner-wrap">
                    <div className="email-wrap">
                      <input type="email" name="EMAIL" required placeholder="Enter Your Email" />
                      <button type="submit">Subscribe!</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll to top */}
        <div className="page-container">
          <div className="vc_row holder">
            <div className="vc_col-md-6 vc_col-xs-6 -left-bar"></div>
            <div className="vc_col-md-6 vc_col-xs-6 -right-bar">
              <a
                href="#"
                className="scroll-top -undash -unlink -small-t -right visible"
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >
                <button className="icon-button -small -no-transition" aria-label="Scroll to top">
                  <i className="icon -no-transition">
                    <svg className="default" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                      <path d="M442.5-170v-476L223-426.5 170-480l310-310 310 310-53 53.5L517.5-646v476h-75Z" />
                    </svg>
                  </i>
                </button>
                <div className="scroll-top-holder titles-typo">Scroll to top</div>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="site-footer-copyright">
          <div className="page-container">
            <div className="vc_row">
              <div className="vc_col-md-12">
                <div className="holder -center">
                  © {new Date().getFullYear()} Economic Policy Research Centre. All Rights Reserved.
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
