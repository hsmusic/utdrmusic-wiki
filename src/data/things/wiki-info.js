import {input} from '#composite';
import find from '#find';
import {isLanguageCode, isName, isURL} from '#validators';

import {
  color,
  flag,
  name,
  referenceList,
  simpleString,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

export class WikiInfo extends Thing {
  static [Thing.friendlyName] = `Wiki Info`;

  static [Thing.getPropertyDescriptors] = ({Group}) => ({
    // Update & expose

    name: name('Unnamed Wiki'),

    // Displayed in nav bar.
    nameShort: {
      flags: {update: true, expose: true},
      update: {validate: isName},

      expose: {
        dependencies: ['name'],
        transform: (value, {name}) => value ?? name,
      },
    },

    color: color(),

    // One-line description used for <meta rel="description"> tag.
    description: simpleString(),

    footerContent: simpleString(),

    defaultLanguage: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    canonicalBase: {
      flags: {update: true, expose: true},
      update: {validate: isURL},
    },

    divideTrackListsByGroups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    // Feature toggles
    enableFlashesAndGames: flag(false),
    enableListings: flag(false),
    enableNews: flag(false),
    enableArtTagUI: flag(false),
    enableGroupUI: flag(false),

    // Update only

    groupData: wikiData(Group),
  });
}
