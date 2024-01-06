import {input} from '#composite';
import find from '#find';
import {isName, validateArrayItems} from '#validators';

import {
  contentString,
  directory,
  fileExtension,
  flag,
  name,
  singleReference,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import Thing from './thing.js';

export class Artist extends Thing {
  static [Thing.referenceType] = 'artist';

  static [Thing.getPropertyDescriptors] = ({Album, Flash, Track}) => ({
    // Update & expose

    name: name('Unnamed Artist'),
    directory: directory(),
    urls: urls(),

    contextNotes: contentString(),

    hasAvatar: flag(false),
    avatarFileExtension: fileExtension('jpg'),

    aliasNames: {
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isName)},
      expose: {transform: (names) => names ?? []},
    },

    isAlias: flag(),

    aliasedArtist: singleReference({
      class: input.value(Artist),
      find: input.value(find.artist),
      data: 'artistData',
    }),

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    artistData: wikiData({
      class: input.value(Artist),
    }),

    flashData: wikiData({
      class: input.value(Flash),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

    // Expose only

    tracksAsArtist:
      Artist.filterByContrib('trackData', 'artistContribs'),
    tracksAsContributor:
      Artist.filterByContrib('trackData', 'contributorContribs'),
    tracksAsCoverArtist:
      Artist.filterByContrib('trackData', 'coverArtistContribs'),

    tracksAsAny: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'trackData'],

        compute: ({this: artist, trackData}) =>
          trackData?.filter((track) =>
            [
              ...track.artistContribs ?? [],
              ...track.contributorContribs ?? [],
              ...track.coverArtistContribs ?? [],
            ].some(({who}) => who === artist)) ?? [],
      },
    },

    tracksAsCommentator: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'trackData'],

        compute: ({this: artist, trackData}) =>
          trackData?.filter(({commentatorArtists}) =>
            commentatorArtists.includes(artist)) ?? [],
      },
    },

    albumsAsAlbumArtist:
      Artist.filterByContrib('albumData', 'artistContribs'),
    albumsAsCoverArtist:
      Artist.filterByContrib('albumData', 'coverArtistContribs'),
    albumsAsWallpaperArtist:
      Artist.filterByContrib('albumData', 'wallpaperArtistContribs'),
    albumsAsBannerArtist:
      Artist.filterByContrib('albumData', 'bannerArtistContribs'),

    albumsAsAny: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData'],

        compute: ({albumData, [Artist.instance]: artist}) =>
          albumData?.filter((album) =>
            [
              ...album.artistContribs,
              ...album.coverArtistContribs,
              ...album.wallpaperArtistContribs,
              ...album.bannerArtistContribs,
            ].some(({who}) => who === artist)) ?? [],
      },
    },

    albumsAsCommentator: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'albumData'],

        compute: ({this: artist, albumData}) =>
          albumData?.filter(({commentatorArtists}) =>
            commentatorArtists.includes(artist)) ?? [],
      },
    },

    flashesAsContributor:
      Artist.filterByContrib('flashData', 'contributorContribs'),
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    directory: S.id,
    urls: S.id,
    contextNotes: S.id,

    hasAvatar: S.id,
    avatarFileExtension: S.id,

    aliasNames: S.id,

    tracksAsArtist: S.toRefs,
    tracksAsContributor: S.toRefs,
    tracksAsCoverArtist: S.toRefs,
    tracksAsCommentator: S.toRefs,

    albumsAsAlbumArtist: S.toRefs,
    albumsAsCoverArtist: S.toRefs,
    albumsAsWallpaperArtist: S.toRefs,
    albumsAsBannerArtist: S.toRefs,
    albumsAsCommentator: S.toRefs,

    flashesAsContributor: S.toRefs,
  });

  static filterByContrib = (thingDataProperty, contribsProperty) => ({
    flags: {expose: true},

    expose: {
      dependencies: ['this', thingDataProperty],

      compute: ({
        this: artist,
        [thingDataProperty]: thingData,
      }) =>
        thingData?.filter(thing =>
          thing[contribsProperty]
            ?.some(contrib => contrib.who === artist)) ?? [],
    },
  });
}
