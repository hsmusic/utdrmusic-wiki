import {inspect} from 'node:util';

import {colors} from '#cli';
import find from '#find';
import {empty} from '#sugar';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  input,
  raiseOutputWithoutDependency,
  templateCompositeFrom,
  withPropertyFromObject,
} from '#composite';

import {
  isColor,
  isContributionList,
  isDate,
  isFileExtension,
  oneOf,
} from '#validators';

import CacheableObject from './cacheable-object.js';

import Thing, {
  additionalFiles,
  commentary,
  commentatorArtists,
  contributionList,
  directory,
  duration,
  flag,
  name,
  referenceList,
  reverseReferenceList,
  simpleDate,
  singleReference,
  simpleString,
  urls,
  wikiData,
  withResolvedContribs,
  withResolvedReference,
  withReverseReferenceList,
} from './thing.js';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({Album, ArtTag, Artist, Flash}) => ({
    // Update & expose

    name: name('Unnamed Track'),
    directory: directory(),

    duration: duration(),
    urls: urls(),
    dateFirstReleased: simpleDate(),

    color: [
      exposeUpdateValueOrContinue(),

      withContainingTrackSection(),
      withPropertyFromObject({object: '#trackSection', property: 'color'}),
      exposeDependencyOrContinue({dependency: '#trackSection.color'}),

      withPropertyFromAlbum({property: 'color'}),
      exposeDependency({
        dependency: '#album.color',
        update: {validate: isColor},
      }),
    ],

    // Disables presenting the track as though it has its own unique artwork.
    // This flag should only be used in select circumstances, i.e. to override
    // an album's trackCoverArtists. This flag supercedes that property, as well
    // as the track's own coverArtists.
    disableUniqueCoverArt: flag(),

    // File extension for track's corresponding media file. This represents the
    // track's unique cover artwork, if any, and does not inherit the extension
    // of the album's main artwork. It does inherit trackCoverArtFileExtension,
    // if present on the album.
    coverArtFileExtension: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({property: 'trackCoverArtFileExtension'}),
      exposeDependencyOrContinue({dependency: '#album.trackCoverArtFileExtension'}),

      exposeConstant({
        value: 'jpg',
        update: {validate: isFileExtension},
      }),
    ],

    // Date of cover art release. Like coverArtFileExtension, this represents
    // only the track's own unique cover artwork, if any. This exposes only as
    // the track's own coverArtDate or its album's trackArtDate, so if neither
    // is specified, this value is null.
    coverArtDate: [
      withHasUniqueCoverArt(),
      exitWithoutDependency({dependency: '#hasUniqueCoverArt', mode: 'falsy'}),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({property: 'trackArtDate'}),
      exposeDependency({
        dependency: '#album.trackArtDate',
        update: {validate: isDate},
      }),
    ],

    commentary: commentary(),
    lyrics: simpleString(),

    additionalFiles: additionalFiles(),
    sheetMusicFiles: additionalFiles(),
    midiProjectFiles: additionalFiles(),

    originalReleaseTrack: singleReference({
      class: Track,
      find: find.track,
      data: 'trackData',
    }),

    // Internal use only - for directly identifying an album inside a track's
    // util.inspect display, if it isn't indirectly available (by way of being
    // included in an album's track list).
    dataSourceAlbum: singleReference({
      class: Album,
      find: find.album,
      data: 'albumData',
    }),

    artistContribs: [
      inheritFromOriginalRelease({property: 'artistContribs'}),

      withResolvedContribs({
        from: input.updateValue(),
      }).outputs({
        '#resolvedContribs': '#artistContribs',
      }),

      exposeDependencyOrContinue({dependency: '#artistContribs'}),

      withPropertyFromAlbum({property: 'artistContribs'}),
      exposeDependency({
        dependency: '#album.artistContribs',
        update: {validate: isContributionList},
      }),
    ],

    contributorContribs: [
      inheritFromOriginalRelease({property: 'contributorContribs'}),
      contributionList(),
    ],

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: [
      exitWithoutUniqueCoverArt(),

      withResolvedContribs({
        from: input.updateValue(),
      }).outputs({
        '#resolvedContribs': '#coverArtistContribs',
      }),

      exposeDependencyOrContinue({dependency: '#coverArtistContribs'}),

      withPropertyFromAlbum({property: 'trackCoverArtistContribs'}),
      exposeDependency({
        dependency: '#album.trackCoverArtistContribs',
        update: {validate: isContributionList},
      }),
    ],

    referencedTracks: [
      inheritFromOriginalRelease({property: 'referencedTracks'}),
      referenceList({
        class: Track,
        find: find.track,
        data: 'trackData',
      }),
    ],

    sampledTracks: [
      inheritFromOriginalRelease({property: 'sampledTracks'}),
      referenceList({
        class: Track,
        find: find.track,
        data: 'trackData',
      }),
    ],

    artTags: referenceList({
      class: ArtTag,
      find: find.artTag,
      data: 'artTagData',
    }),

    // Update only

    albumData: wikiData(Album),
    artistData: wikiData(Artist),
    artTagData: wikiData(ArtTag),
    flashData: wikiData(Flash),
    trackData: wikiData(Track),

    // Expose only

    commentatorArtists: commentatorArtists(),

    album: [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ],

    date: [
      exposeDependencyOrContinue({dependency: 'dateFirstReleased'}),
      withPropertyFromAlbum({property: 'date'}),
      exposeDependency({dependency: '#album.date'}),
    ],

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    hasUniqueCoverArt: [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
    ],

    otherReleases: [
      exitWithoutDependency({dependency: 'trackData', mode: 'empty'}),
      withOriginalRelease({selfIfOriginal: true}),

      {
        flags: {expose: true},
        expose: {
          dependencies: ['this', 'trackData', '#originalRelease'],
          compute: ({
            this: thisTrack,
            trackData,
            '#originalRelease': originalRelease,
          }) =>
            (originalRelease === thisTrack
              ? []
              : [originalRelease])
              .concat(trackData.filter(track =>
                track !== originalRelease &&
                track !== thisTrack &&
                track.originalReleaseTrack === originalRelease)),
        },
      },
    ],

    // Specifically exclude re-releases from this list - while it's useful to
    // get from a re-release to the tracks it references, re-releases aren't
    // generally relevant from the perspective of the tracks being referenced.
    // Filtering them from data here hides them from the corresponding field
    // on the site (obviously), and has the bonus of not counting them when
    // counting the number of times a track has been referenced, for use in
    // the "Tracks - by Times Referenced" listing page (or other data
    // processing).
    referencedByTracks: trackReverseReferenceList({
      list: 'referencedTracks',
    }),

    // For the same reasoning, exclude re-releases from sampled tracks too.
    sampledByTracks: trackReverseReferenceList({
      list: 'sampledTracks',
    }),

    featuredInFlashes: reverseReferenceList({
      data: 'flashData',
      list: 'featuredTracks',
    }),
  });

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'originalReleaseTrack')) {
      parts.unshift(`${colors.yellow('[rerelease]')} `);
    }

    let album;
    if (depth >= 0 && (album = this.album ?? this.dataSourceAlbum)) {
      const albumName = album.name;
      const albumIndex = album.tracks.indexOf(this);
      const trackNum =
        (albumIndex === -1
          ? '#?'
          : `#${albumIndex + 1}`);
      parts.push(` (${colors.yellow(trackNum)} in ${colors.green(albumName)})`);
    }

    return parts.join('');
  }
}

// Early exits with a value inherited from the original release, if
// this track is a rerelease, and otherwise continues with no further
// dependencies provided. If allowOverride is true, then the continuation
// will also be called if the original release exposed the requested
// property as null.
export const inheritFromOriginalRelease = templateCompositeFrom({
  annotation: `Track.inheritFromOriginalRelease`,

  inputs: {
    property: input({type: 'string'}),
    allowOverride: input({type: 'boolean', defaultValue: false}),
  },

  steps: () => [
    withOriginalRelease(),

    {
      dependencies: [
        '#originalRelease',
        input('property'),
        input('allowOverride'),
      ],

      compute: (continuation, {
        ['#originalRelease']: originalRelease,
        [input('property')]: originalProperty,
        [input('allowOverride')]: allowOverride,
      }) => {
        if (!originalRelease) return continuation();

        const value = originalRelease[originalProperty];
        if (allowOverride && value === null) return continuation();

        return continuation.exit(value);
      },
    },
  ],
});

// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.
export const withAlbum = templateCompositeFrom({
  annotation: `Track.withAlbum`,

  inputs: {
    notFoundMode: input({
      validate: oneOf('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: {
    into: '#album',
  },

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'albumData',
      mode: input.value('empty'),
      output: input.value({into: null}),
    }),

    {
      dependencies: ['this', 'albumData'],
      compute: (continuation, {this: track, albumData}) =>
        continuation({
          '#album': albumData.find(album => album.tracks.includes(track)),
        }),
    },

    raiseOutputWithoutDependency({
      dependency: '#album',
      output: input.value({into: null}),
    }),

    {
      dependencies: ['#album'],
      compute: (continuation, {'#album': album}) =>
        continuation({into: album}),
    },
  ],
});

// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default). If the track's album
// isn't available, then by default, the property will be provided as null;
// set {notFoundMode: 'exit'} to early exit instead.
export const withPropertyFromAlbum = templateCompositeFrom({
  annotation: `withPropertyFromAlbum`,

  inputs: {
    property: input.staticValue({type: 'string'}),

    notFoundMode: input({
      validate: oneOf('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: {
    dependencies: [input.staticValue('property')],
    compute: ({
      [input.staticValue('property')]: property,
    }) => ['#album.' + property],
  },

  steps: () => [
    withAlbum({
      notFoundMode: input('notFoundMode'),
    }),

    withPropertyFromObject({
      object: '#album',
      property: input('property'),
    }),

    {
      dependencies: ['#value', input.staticValue('property')],
      compute: (continuation, {
        ['#value']: value,
        [input.staticValue('property')]: property,
      }) => continuation({
        ['#album.' + property]: value,
      }),
    },
  ],
});

// Gets the track section containing this track from its album's track list.
// If notFoundMode is set to 'exit', this will early exit if the album can't be
// found or if none of its trackSections includes the track for some reason.
export const withContainingTrackSection = templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  inputs: {
    notFoundMode: input({
      validate: oneOf('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: {
    into: '#trackSection',
  },

  steps: () => [
    withPropertyFromAlbum({
      property: input.value('trackSections'),
      notFoundMode: input('notFoundMode'),
    }),

    {
      dependencies: [
        input.myself(),
        input('notFoundMode'),
        '#album.trackSections',
      ],

      compute(continuation, {
        [input.myself()]: track,
        [input('notFoundMode')]: notFoundMode,
        ['#album.trackSections']: trackSections,
      }) {
        if (!trackSections) {
          return continuation({into: null});
        }

        const trackSection =
          trackSections.find(({tracks}) => tracks.includes(track));

        if (trackSection) {
          return continuation({into: trackSection});
        } else if (notFoundMode === 'exit') {
          return continuation.exit(null);
        } else {
          return continuation({into: null});
        }
      },
    },
  ],
});

// Just includes the original release of this track as a dependency.
// If this track isn't a rerelease, then it'll provide null, unless the
// {selfIfOriginal} option is set, in which case it'll provide this track
// itself. Note that this will early exit if the original release is
// specified by reference and that reference doesn't resolve to anything.
// Outputs to '#originalRelease' by default.
export const withOriginalRelease = templateCompositeFrom({
  annotation: `withOriginalRelease`,

  inputs: {
    selfIfOriginal: input({type: 'boolean', defaultValue: false}),
  },

  outputs: {
    into: '#originalRelease',
  },

  steps: () => [
    withResolvedReference
      .inputs({
        ref: 'originalReleaseTrack',
        data: 'trackData',
        find: input.value(find.track),
        notFoundMode: input.value('exit'),
      })
      .outputs({into: '#originalRelease'}),

    {
      dependencies: [
        input.myself(),
        input('selfIfOriginal'),
        '#originalRelease',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfOriginal')]: selfIfOriginal,
        ['#originalRelease']: originalRelease,
      }) =>
        continuation({
          into:
            (originalRelease ??
              (selfIfOriginal
                ? track
                : null)),
        }),
    },
  ],
});

// The algorithm for checking if a track has unique cover art is used in a
// couple places, so it's defined in full as a compositional step.
export const withHasUniqueCoverArt = templateCompositeFrom({
  annotation: 'withHasUniqueCoverArt',

  outputs: {
    into: '#hasUniqueCoverArt',
  },

  steps: () => [
    {
      dependencies: ['disableUniqueCoverArt'],
      compute: (continuation, {disableUniqueCoverArt}) =>
        (disableUniqueCoverArt
          ? continuation.raiseOutput({into: false})
          : continuation()),
    },

    withResolvedContribs
      .inputs({from: 'coverArtistContribs'})
      .outputs({into: '#coverArtistContribs'}),

    {
      dependencies: ['#coverArtistContribs'],
      compute: (continuation, {
        ['#coverArtistContribs']: contribsFromTrack,
      }) =>
        (empty(contribsFromTrack)
          ? continuation()
          : continuation.raiseOutput({into: true})),
    },

    withPropertyFromAlbum({property: 'trackCoverArtistContribs'}),

    {
      dependencies: ['#album.trackCoverArtistContribs'],
      compute: (continuation, {
        ['#album.trackCoverArtistContribs']: contribsFromAlbum,
      }) =>
        continuation({
          into: !empty(contribsFromAlbum),
        }),
    },
  ],
});

// Shorthand for checking if the track has unique cover art and exposing a
// fallback value if it isn't.
export const exitWithoutUniqueCoverArt = templateCompositeFrom({
  annotation: `exitWithoutUniqueCoverArt`,

  inputs: {
    value: input({null: true}),
  },

  steps: () => [
    withHasUniqueCoverArt(),

    exitWithoutDependency({
      dependency: '#hasUniqueCoverArt',
      mode: 'falsy',
      value: input('value'),
    }),
  ],
});

export const trackReverseReferenceList = templateCompositeFrom({
  annotation: `trackReverseReferenceList`,

  inputs: {
    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseReferenceList({
      data: 'trackData',
      list: input('list'),
    }),

    {
      flags: {expose: true},
      expose: {
        dependencies: ['#reverseReferenceList'],
        compute: ({
          ['#reverseReferenceList']: reverseReferenceList,
        }) =>
          reverseReferenceList.filter(track => !track.originalReleaseTrack),
      },
    },
  ],
});
