export default {
  contentDependencies: [
    'generateFooterLocalizationLinks',
  ],

  extraDependencies: [
    'cachebust',
    'html',
    'language',
    'to',
    'transformMultiline',
    'wikiInfo',
  ],

  relations(relation) {
    const relations = {};

    relations.footerLocalizationLinks =
      relation('generateFooterLocalizationLinks');

    return relations;
  },

  generate(relations, {
    cachebust,
    html,
    language,
    to,
    transformMultiline,
    wikiInfo,
  }) {
    const sidebarSlots = side => ({
      // Content is a flat HTML array. It'll generate one sidebar section
      // if specified.
      [side + 'Content']: {type: 'html'},

      // Multiple is an array of {content: (HTML)} objects. Each of these
      // will generate one sidebar section.
      [side + 'Multiple']: {
        validate: v =>
          v.arrayOf(
            v.validateProperties({
              content: v.isHTML,
            })),
      },

      // Sticky mode controls which sidebar section(s), if any, follow the
      // scroll position, "sticking" to the top of the browser viewport.
      //
      // 'last' - last or only sidebar box is sticky
      // 'column' - entire column, incl. multiple boxes from top, is sticky
      // 'none' - sidebar not sticky at all, stays at top of page
      //
      // Note: This doesn't affect the content of any sidebar section, only
      // the whole section's containing box (or the sidebar column as a whole).
      [side + 'StickyMode']: {
        validate: v => v.is('last', 'column', 'static'),
      },

      // Collapsing sidebars disappear when the viewport is sufficiently
      // thin. (This is the default.) Override as false to make the sidebar
      // stay visible in thinner viewports, where the page layout will be
      // reflowed so the sidebar is as wide as the screen and appears below
      // nav, above the main content.
      [side + 'Collapse']: {type: 'boolean', default: true},

      // Wide sidebars generally take up more horizontal space in the normal
      // page layout, and should be used if the content of the sidebar has
      // a greater than typical focus compared to main content.
      [side + 'Wide']: {type: 'boolean', defualt: false},
    });

    return html.template({
      annotation: 'generatePageLayout',

      slots: {
        title: {type: 'html'},
        cover: {type: 'html'},

        socialEmbed: {type: 'html'},

        styleRules: {
          validate: v => v.arrayOf(v.isString),
          default: [],
        },

        mainClasses: {
          validate: v => v.arrayOf(v.isString),
          default: [],
        },

        // Main

        mainContent: {type: 'html'},

        headingMode: {
          validate: v => v.is('sticky', 'static'),
          default: 'static',
        },

        // Sidebars

        ...sidebarSlots('leftSidebar'),
        ...sidebarSlots('rightSidebar'),

        // Nav & Footer

        footerContent: {type: 'html'},
      },

      content(slots) {
        let titleHTML = null;

        if (!html.isBlank(slots.title)) {
          switch (slots.headingMode) {
            case 'sticky':
              /*
                generateStickyHeadingContainer({
                  coverSrc: cover.src,
                  coverAlt: cover.alt,
                  coverArtTags: cover.artTags,
                  title,
                })
              */
              break;
            case 'static':
              titleHTML = html.tag('h1', slots.title);
              break;
          }
        }

        let footerContent = slots.footerContent;

        if (html.isBlank(footerContent) && wikiInfo.footerContent) {
          footerContent = transformMultiline(wikiInfo.footerContent);
        }

        const mainHTML =
          html.tag('main', {
            id: 'content',
            class: slots.mainClasses,
          }, [
            titleHTML,

            slots.cover,

            html.tag('div',
              {
                [html.onlyIfContent]: true,
                class: 'main-content-container',
              },
              slots.mainContent),
          ]);

        const footerHTML =
          html.tag('footer',
            {[html.onlyIfContent]: true, id: 'footer'},
            [
              html.tag('div',
                {
                  [html.onlyIfContent]: true,
                  class: 'footer-content',
                },
                footerContent),

              relations.footerLocalizationLinks,
            ]);

        const generateSidebarHTML = (side, id) => {
          const content = slots[side + 'Content'];
          const multiple = slots[side + 'Multiple'];
          const stickyMode = slots[side + 'StickyMode'];
          const wide = slots[side + 'Wide'];
          const collapse = slots[side + 'Collapse'];

          let sidebarClasses = [];
          let sidebarContent = html.blank();

          if (!html.isBlank(content)) {
            sidebarClasses = ['sidebar'];
            sidebarContent = content;
          } else if (multiple) {
            sidebarClasses = ['sidebar-multiple'];
            sidebarContent =
              multiple
                .filter(Boolean)
                .map(({content}) =>
                  html.tag('div',
                    {
                      [html.onlyIfContent]: true,
                      class: 'sidebar',
                    },
                    content));
          }

          return html.tag('div',
            {
              [html.onlyIfContent]: true,
              id,
              class: [
                'sidebar-column',
                wide && 'wide',
                !collapse && 'no-hide',
                stickyMode !== 'static' && `sticky-${stickyMode}`,
                ...sidebarClasses,
              ],
            },
            sidebarContent);
        }

        const sidebarLeftHTML = generateSidebarHTML('leftSidebar', 'sidebar-left');
        const sidebarRightHTML = generateSidebarHTML('rightSidebar', 'sidebar-right');
        const collapseSidebars = slots.leftSidebarCollapse && slots.rightSidebarCollapse;

        const layoutHTML = [
          // navHTML,
          // banner.position === 'top' && bannerHTML,
          // secondaryNavHTML,
          html.tag('div',
            {
              class: [
                'layout-columns',
                !collapseSidebars && 'vertical-when-thin',
                (sidebarLeftHTML || sidebarRightHTML) && 'has-one-sidebar',
                (sidebarLeftHTML && sidebarRightHTML) && 'has-two-sidebars',
                !(sidebarLeftHTML || sidebarRightHTML) && 'has-zero-sidebars',
                sidebarLeftHTML && 'has-sidebar-left',
                sidebarRightHTML && 'has-sidebar-right',
              ],
            },
            [
              sidebarLeftHTML,
              mainHTML,
              sidebarRightHTML,
            ]),
          // banner.position === 'bottom' && bannerHTML,
          footerHTML,
        ].filter(Boolean).join('\n');

        const documentHTML = html.tags([
          `<!DOCTYPE html>`,
          html.tag('html',
            {
              lang: language.intlCode,
              'data-language-code': language.code,

              /*
              'data-url-key': 'localized.' + pagePath[0],
              ...Object.fromEntries(
                pagePath.slice(1).map((v, i) => [['data-url-value' + i], v])),
              */

              'data-rebase-localized': to('localized.root'),
              'data-rebase-shared': to('shared.root'),
              'data-rebase-media': to('media.root'),
              'data-rebase-data': to('data.root'),
            },
            [
              // developersComment,

              html.tag('head', [
                /*
                html.tag('title',
                  showWikiNameInTitle
                    ? language.formatString('misc.pageTitle.withWikiName', {
                        title,
                        wikiName: wikiInfo.nameShort,
                      })
                    : language.formatString('misc.pageTitle', {title})),
                */

                html.tag('meta', {charset: 'utf-8'}),
                html.tag('meta', {
                  name: 'viewport',
                  content: 'width=device-width, initial-scale=1',
                }),

                /*
                ...(
                  Object.entries(meta)
                    .filter(([key, value]) => value)
                    .map(([key, value]) => html.tag('meta', {[key]: value}))),

                canonical &&
                  html.tag('link', {
                    rel: 'canonical',
                    href: canonical,
                  }),

                ...(
                  localizedCanonical
                    .map(({lang, href}) => html.tag('link', {
                      rel: 'alternate',
                      hreflang: lang,
                      href,
                    }))),

                */

                // slots.socialEmbed,

                html.tag('link', {
                  rel: 'stylesheet',
                  href: to('shared.staticFile', `site3.css?${cachebust}`),
                }),

                html.tag('style',
                  {[html.onlyIfContent]: true},
                  slots.styleRules),

                html.tag('script', {
                  src: to('shared.staticFile', `lazy-loading.js?${cachebust}`),
                }),
              ]),

              html.tag('body',
                // {style: body.style || ''},
                [
                  html.tag('div', {id: 'page-container'}, [
                    // mainHTML && skippersHTML,
                    layoutHTML,
                  ]),

                  // infoCardHTML,
                  // imageOverlayHTML,

                  html.tag('script', {
                    type: 'module',
                    src: to('shared.staticFile', `client.js?${cachebust}`),
                  }),
                ]),
            ])
        ]);

        return documentHTML;
      },
    });
  },
};
