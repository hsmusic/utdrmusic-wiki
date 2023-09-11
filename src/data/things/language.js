import {Tag} from '#html';
import {isLanguageCode} from '#validators';

import CacheableObject from './cacheable-object.js';

import Thing, {
  externalFunction,
  flag,
  simpleString,
} from './thing.js';

export class Language extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    // General language code. This is used to identify the language distinctly
    // from other languages (similar to how "Directory" operates in many data
    // objects).
    code: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    // Human-readable name. This should be the language's own native name, not
    // localized to any other language.
    name: simpleString(),

    // Language code specific to JavaScript's Internationalization (Intl) API.
    // Usually this will be the same as the language's general code, but it
    // may be overridden to provide Intl constructors an alternative value.
    intlCode: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
      expose: {
        dependencies: ['code'],
        transform: (intlCode, {code}) => intlCode ?? code,
      },
    },

    // Flag which represents whether or not to hide a language from general
    // access. If a language is hidden, its portion of the website will still
    // be built (with all strings localized to the language), but it won't be
    // included in controls for switching languages or the <link rel=alternate>
    // tags used for search engine optimization. This flag is intended for use
    // with languages that are currently in development and not ready for
    // formal release, or which are just kept hidden as "experimental zones"
    // for wiki development or content testing.
    hidden: flag(false),

    // Mapping of translation keys to values (strings). Generally, don't
    // access this object directly - use methods instead.
    strings: {
      flags: {update: true, expose: true},
      update: {validate: (t) => typeof t === 'object'},
      expose: {
        dependencies: ['inheritedStrings'],
        transform(strings, {inheritedStrings}) {
          if (strings || inheritedStrings) {
            return {...(inheritedStrings ?? {}), ...(strings ?? {})};
          } else {
            return null;
          }
        },
      },
    },

    // May be provided to specify "default" strings, generally (but not
    // necessarily) inherited from another Language object.
    inheritedStrings: {
      flags: {update: true, expose: true},
      update: {validate: (t) => typeof t === 'object'},
    },

    // Update only

    escapeHTML: externalFunction(),

    // Expose only

    intl_date: this.#intlHelper(Intl.DateTimeFormat, {full: true}),
    intl_number: this.#intlHelper(Intl.NumberFormat),
    intl_listConjunction: this.#intlHelper(Intl.ListFormat, {type: 'conjunction'}),
    intl_listDisjunction: this.#intlHelper(Intl.ListFormat, {type: 'disjunction'}),
    intl_listUnit: this.#intlHelper(Intl.ListFormat, {type: 'unit'}),
    intl_pluralCardinal: this.#intlHelper(Intl.PluralRules, {type: 'cardinal'}),
    intl_pluralOrdinal: this.#intlHelper(Intl.PluralRules, {type: 'ordinal'}),

    validKeys: {
      flags: {expose: true},

      expose: {
        dependencies: ['strings', 'inheritedStrings'],
        compute: ({strings, inheritedStrings}) =>
          Array.from(
            new Set([
              ...Object.keys(inheritedStrings ?? {}),
              ...Object.keys(strings ?? {}),
            ])
          ),
      },
    },

    strings_htmlEscaped: {
      flags: {expose: true},
      expose: {
        dependencies: ['strings', 'inheritedStrings', 'escapeHTML'],
        compute({strings, inheritedStrings, escapeHTML}) {
          if (!(strings || inheritedStrings) || !escapeHTML) return null;
          const allStrings = {...inheritedStrings, ...strings};
          return Object.fromEntries(
            Object.entries(allStrings).map(([k, v]) => [k, escapeHTML(v)])
          );
        },
      },
    },
  });

  static #intlHelper (constructor, opts) {
    return {
      flags: {expose: true},
      expose: {
        dependencies: ['code', 'intlCode'],
        compute: ({code, intlCode}) => {
          const constructCode = intlCode ?? code;
          if (!constructCode) return null;
          return Reflect.construct(constructor, [constructCode, opts]);
        },
      },
    };
  }

  $(key, args = {}) {
    return this.formatString(key, args);
  }

  assertIntlAvailable(property) {
    if (!this[property]) {
      throw new Error(`Intl API ${property} unavailable`);
    }
  }

  getUnitForm(value) {
    this.assertIntlAvailable('intl_pluralCardinal');
    return this.intl_pluralCardinal.select(value);
  }

  formatString(key, args = {}) {
    const strings = this.strings_htmlEscaped;

    if (!this.strings) {
      throw new Error(`Strings unavailable`);
    }

    if (!this.validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} accessed`);
    }

    const template = this.strings[key];

    // Convert the keys on the args dict from camelCase to CONSTANT_CASE.
    // (This isn't an OUTRAGEOUSLY versatile algorithm for doing that, 8ut
    // like, who cares, dude?) Also, this is an array, 8ecause it's handy
    // for the iterating we're a8out to do. Also strip HTML from arguments
    // that are literal strings - real HTML content should always be proper
    // HTML objects (see html.js).
    const processedArgs =
      Object.entries(args).map(([k, v]) => [
        k.replace(/[A-Z]/g, '_$&').toUpperCase(),
        this.#sanitizeStringArg(v),
      ]);

    // Replacement time! Woot. Reduce comes in handy here!
    const output =
      processedArgs.reduce(
        (x, [k, v]) => x.replaceAll(`{${k}}`, v),
        template);

    // Post-processing: if any expected arguments *weren't* replaced, that
    // is almost definitely an error.
    if (output.match(/\{[A-Z_]+\}/)) {
      throw new Error(`Args in ${key} were missing - output: ${output}`);
    }

    // Last caveat: Wrap the output in an HTML tag so that it doesn't get
    // treated as unsanitized HTML if *it* gets passed as an argument to
    // *another* formatString call.
    return this.#wrapSanitized(output);
  }

  // Escapes HTML special characters so they're displayed as-are instead of
  // treated by the browser as a tag. This does *not* have an effect on actual
  // html.Tag objects, which are treated as sanitized by default (so that they
  // can be nested inside strings at all).
  #sanitizeStringArg(arg) {
    const escapeHTML = CacheableObject.getUpdateValue(this, 'escapeHTML');

    if (!escapeHTML) {
      throw new Error(`escapeHTML unavailable`);
    }

    if (typeof arg !== 'string') {
      return arg.toString();
    }

    return escapeHTML(arg);
  }

  // Wraps the output of a formatting function in a no-name-nor-attributes
  // HTML tag, which will indicate to other calls to formatString that this
  // content is a string *that may contain HTML* and doesn't need to
  // sanitized any further. It'll still .toString() to just the string
  // contents, if needed.
  #wrapSanitized(output) {
    return new Tag(null, null, output);
  }

  // Similar to the above internal methods, but this one is public.
  // It should be used when embedding content that may not have previously
  // been sanitized directly into an HTML tag or template's contents.
  // The templating engine usually handles this on its own, as does passing
  // a value (sanitized or not) directly as an argument to formatString,
  // but if you used a custom validation function ({validate: v => v.isHTML}
  // instead of {type: 'string'} / {type: 'html'}) and are embedding the
  // contents of a slot directly, it should be manually sanitized with this
  // function first.
  sanitize(arg) {
    const escapeHTML = CacheableObject.getUpdateValue(this, 'escapeHTML');

    if (!escapeHTML) {
      throw new Error(`escapeHTML unavailable`);
    }

    return (
      (typeof arg === 'string'
        ? new Tag(null, null, escapeHTML(arg))
        : arg));
  }

  formatDate(date) {
    this.assertIntlAvailable('intl_date');
    return this.intl_date.format(date);
  }

  formatDateRange(startDate, endDate) {
    this.assertIntlAvailable('intl_date');
    return this.intl_date.formatRange(startDate, endDate);
  }

  formatDuration(secTotal, {approximate = false, unit = false} = {}) {
    if (secTotal === 0) {
      return this.formatString('count.duration.missing');
    }

    const hour = Math.floor(secTotal / 3600);
    const min = Math.floor((secTotal - hour * 3600) / 60);
    const sec = Math.floor(secTotal - hour * 3600 - min * 60);

    const pad = (val) => val.toString().padStart(2, '0');

    const stringSubkey = unit ? '.withUnit' : '';

    const duration =
      hour > 0
        ? this.formatString('count.duration.hours' + stringSubkey, {
            hours: hour,
            minutes: pad(min),
            seconds: pad(sec),
          })
        : this.formatString('count.duration.minutes' + stringSubkey, {
            minutes: min,
            seconds: pad(sec),
          });

    return approximate
      ? this.formatString('count.duration.approximate', {duration})
      : duration;
  }

  formatIndex(value) {
    this.assertIntlAvailable('intl_pluralOrdinal');
    return this.formatString('count.index.' + this.intl_pluralOrdinal.select(value), {index: value});
  }

  formatNumber(value) {
    this.assertIntlAvailable('intl_number');
    return this.intl_number.format(value);
  }

  formatWordCount(value) {
    const num = this.formatNumber(
      value > 1000 ? Math.floor(value / 100) / 10 : value
    );

    const words =
      value > 1000
        ? this.formatString('count.words.thousand', {words: num})
        : this.formatString('count.words', {words: num});

    return this.formatString('count.words.withUnit.' + this.getUnitForm(value), {words});
  }

  // Conjunction list: A, B, and C
  formatConjunctionList(array) {
    this.assertIntlAvailable('intl_listConjunction');
    return this.#wrapSanitized(
      this.intl_listConjunction.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Disjunction lists: A, B, or C
  formatDisjunctionList(array) {
    this.assertIntlAvailable('intl_listDisjunction');
    return this.#wrapSanitized(
      this.intl_listDisjunction.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Unit lists: A, B, C
  formatUnitList(array) {
    this.assertIntlAvailable('intl_listUnit');
    return this.#wrapSanitized(
      this.intl_listUnit.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Lists without separator: A B C
  formatListWithoutSeparator(array) {
    return this.#wrapSanitized(
      array.map(item => this.#sanitizeStringArg(item))
        .join(' '));
  }

  // File sizes: 42.5 kB, 127.2 MB, 4.13 GB, 998.82 TB
  formatFileSize(bytes) {
    if (!bytes) return '';

    bytes = parseInt(bytes);
    if (isNaN(bytes)) return '';

    const round = (exp) => Math.round(bytes / 10 ** (exp - 1)) / 10;

    if (bytes >= 10 ** 12) {
      return this.formatString('count.fileSize.terabytes', {
        terabytes: round(12),
      });
    } else if (bytes >= 10 ** 9) {
      return this.formatString('count.fileSize.gigabytes', {
        gigabytes: round(9),
      });
    } else if (bytes >= 10 ** 6) {
      return this.formatString('count.fileSize.megabytes', {
        megabytes: round(6),
      });
    } else if (bytes >= 10 ** 3) {
      return this.formatString('count.fileSize.kilobytes', {
        kilobytes: round(3),
      });
    } else {
      return this.formatString('count.fileSize.bytes', {bytes});
    }
  }
}

const countHelper = (stringKey, argName = stringKey) =>
  function(value, {unit = false} = {}) {
    return this.formatString(
      unit
        ? `count.${stringKey}.withUnit.` + this.getUnitForm(value)
        : `count.${stringKey}`,
      {[argName]: this.formatNumber(value)});
  };

// TODO: These are hard-coded. Is there a better way?
Object.assign(Language.prototype, {
  countAdditionalFiles: countHelper('additionalFiles', 'files'),
  countAlbums: countHelper('albums'),
  countArtworks: countHelper('artworks'),
  countFlashes: countHelper('flashes'),
  countCommentaryEntries: countHelper('commentaryEntries', 'entries'),
  countContributions: countHelper('contributions'),
  countCoverArts: countHelper('coverArts'),
  countTimesReferenced: countHelper('timesReferenced'),
  countTimesUsed: countHelper('timesUsed'),
  countTracks: countHelper('tracks'),
});
