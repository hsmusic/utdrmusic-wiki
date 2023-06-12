import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkContribution'],
  extraDependencies: ['html', 'language'],

  relations(relation, contributions) {
    if (empty(contributions)) {
      return {};
    }

    return {
      contributionLinks:
        contributions
          .slice(0, 4)
          .map(({who, what}) =>
            relation('linkContribution', who, what)),
    };
  },

  slots: {
    stringKey: {type: 'string'},

    showContribution: {type: 'boolean', default: true},
    showIcons: {type: 'boolean', default: true},
  },

  generate(relations, slots, {html, language}) {
    if (!relations.contributionLinks) {
      return html.blank();
    }

    return language.$(slots.stringKey, {
      artists:
        language.formatConjunctionList(
          relations.contributionLinks.map(link =>
            link.slots({
              showContribution: slots.showContribution,
              showIcons: slots.showIcons,
            }))),
    });
  },
};
