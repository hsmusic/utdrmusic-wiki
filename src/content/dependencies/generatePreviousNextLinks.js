export default {
  // Returns an array with the slotted previous and next links, prepared
  // for inclusion in a page's navigation bar. Include with other links
  // in the nav bar and then join them all as a unit list, for example.

  extraDependencies: ['html', 'language'],

  slots: {
    previousLink: {type: 'html'},
    nextLink: {type: 'html'},
  },

  generate(slots, {html, language}) {
    return [
      !html.isBlank(slots.previousLink) &&
        slots.previousLink.slots({
          tooltip: true,
          color: false,
          attributes: {id: 'previous-button'},
          content: language.$('misc.nav.previous'),
        }),

      !html.isBlank(slots.nextLink) &&
        slots.nextLink?.slots({
          tooltip: true,
          color: false,
          attributes: {id: 'next-button'},
          content: language.$('misc.nav.next'),
        }),
    ];
  },
};
