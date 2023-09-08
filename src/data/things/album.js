import find from '#find';
import {empty} from '#sugar';
import {isDate, isDimensions, isTrackSectionList} from '#validators';

import {
  compositeFrom,
  exitWithoutDependency,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite';

import Thing, {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
  contribsPresent,
  contributionList,
  directory,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleDate,
  simpleString,
  urls,
  wikiData,
  withResolvedContribs,
  withResolvedReferenceList,
} from './thing.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({ArtTag, Artist, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

    date: simpleDate(),
    trackArtDate: simpleDate(),
    dateAddedToWiki: simpleDate(),

    coverArtDate: compositeFrom(`Album.coverArtDate`, [
      withResolvedContribs({from: 'coverArtistContribs'}),
      exitWithoutDependency({dependency: '#resolvedContribs', mode: 'empty'}),

      exposeUpdateValueOrContinue(),
      exposeDependency({
        dependency: 'date',
        update: {validate: isDate},
      }),
    ]),

    artistContribs: contributionList(),
    coverArtistContribs: contributionList(),
    trackCoverArtistContribs: contributionList(),
    wallpaperArtistContribs: contributionList(),
    bannerArtistContribs: contributionList(),

    groups: referenceList({
      class: Group,
      find: find.group,
      data: 'groupData',
    }),

    artTags: referenceList({
      class: ArtTag,
      find: find.artTag,
      data: 'artTagData',
    }),

    trackSections: {
      flags: {update: true, expose: true},

      update: {
        validate: isTrackSectionList,
      },

      expose: {
        dependencies: ['color', 'trackData'],
        transform(trackSections, {
          color: albumColor,
          trackData,
        }) {
          let startIndex = 0;
          return trackSections?.map(section => ({
            name: section.name ?? null,
            color: section.color ?? albumColor ?? null,
            dateOriginallyReleased: section.dateOriginallyReleased ?? null,
            isDefaultTrackSection: section.isDefaultTrackSection ?? false,

            startIndex: (
              startIndex += section.tracks.length,
              startIndex - section.tracks.length
            ),

            tracks:
              (trackData && section.tracks
                ?.map(ref => find.track(ref, trackData, {mode: 'quiet'}))
                .filter(Boolean)) ??
              [],
          }));
        },
      },
    },

    coverArtFileExtension: compositeFrom(`Album.coverArtFileExtension`, [
      withResolvedContribs({from: 'coverArtistContribs'}),
      exitWithoutDependency({dependency: '#resolvedContribs', mode: 'empty'}),
      fileExtension('jpg'),
    ]),

    trackCoverArtFileExtension: fileExtension('jpg'),

    wallpaperStyle: simpleString(),
    wallpaperFileExtension: fileExtension('jpg'),

    bannerStyle: simpleString(),
    bannerFileExtension: fileExtension('jpg'),
    bannerDimensions: {
      flags: {update: true, expose: true},
      update: {validate: isDimensions},
    },

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    additionalFiles: additionalFiles(),

    // Update only

    artistData: wikiData(Artist),
    artTagData: wikiData(ArtTag),
    groupData: wikiData(Group),
    trackData: wikiData(Track),

    // Expose only

    commentatorArtists: commentatorArtists(),

    hasCoverArt: contribsPresent('coverArtistContribs'),
    hasWallpaperArt: contribsPresent('wallpaperArtistContribs'),
    hasBannerArt: contribsPresent('bannerArtistContribs'),

    tracks: compositeFrom(`Album.tracks`, [
      exitWithoutDependency({
        dependency: 'trackSections',
        mode: 'empty',
        value: [],
      }),

      {
        dependencies: ['trackSections', 'trackData'],
        compute: ({trackSections, trackData}, continuation) =>
          continuation({
            '#trackRefs': trackSections
              .flatMap(section => section.tracks ?? []),
          }),
      },

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        find: find.track,
      }),

      exposeDependency({dependency: '#resolvedReferenceList'}),
    ]),
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    color: S.id,
    directory: S.id,
    urls: S.id,

    date: S.id,
    coverArtDate: S.id,
    trackArtDate: S.id,
    dateAddedToWiki: S.id,

    artistContribs: S.toContribRefs,
    coverArtistContribs: S.toContribRefs,
    trackCoverArtistContribs: S.toContribRefs,
    wallpaperArtistContribs: S.toContribRefs,
    bannerArtistContribs: S.toContribRefs,

    coverArtFileExtension: S.id,
    trackCoverArtFileExtension: S.id,
    wallpaperStyle: S.id,
    wallpaperFileExtension: S.id,
    bannerStyle: S.id,
    bannerFileExtension: S.id,
    bannerDimensions: S.id,

    hasTrackArt: S.id,
    isListedOnHomepage: S.id,

    commentary: S.id,
    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
  });
}

export class TrackSectionHelper extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    name: name('Unnamed Track Group'),
    color: color(),
    dateOriginallyReleased: simpleDate(),
    isDefaultTrackGroup: flag(false),
  })
}
