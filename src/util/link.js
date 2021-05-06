// This file is essentially one level of a8straction a8ove urls.js (and the
// urlSpec it gets its paths from). It's a 8unch of utility functions which
// take certain types of wiki data o8jects (colloquially known as "things")
// and return actual <a href> HTML link tags.
//
// The functions we're cre8ting here (all factory-style) take a "to" argument,
// which is roughly a function which takes a urlSpec key and spits out a path
// to 8e stuck in an href or src or suchever. There are also a few other
// options availa8le in all the functions, making a common interface for
// gener8ting just a8out any link on the site.

import * as html from './html.js'
import { getLinkThemeString } from './colors.js'

const linkHelper = (hrefFn, {color = true, attr = null} = {}) =>
    (thing, {
        strings, to,
        text = '',
        class: className = '',
        hash = ''
    }) => (
        html.tag('a', {
            ...attr ? attr(thing) : {},
            href: hrefFn(thing, {to}) + (hash ? (hash.startsWith('#') ? '' : '#') + hash : ''),
            style: color ? getLinkThemeString(thing.color) : '',
            class: className
        }, text || thing.name)
    );

const linkDirectory = (key, {expose = null, attr = null, ...conf} = {}) =>
    linkHelper((thing, {to}) => to('localized.' + key, thing.directory), {
        attr: thing => ({
            ...attr ? attr(thing) : {},
            ...expose ? {[expose]: thing.directory} : {}
        }),
        ...conf
    });

const linkPathname = (key, conf) => linkHelper(({directory: pathname}, {to}) => to(key, pathname), conf);
const linkIndex = (key, conf) => linkHelper((_, {to}) => to('localized.' + key), conf);

const link = {
    album: linkDirectory('album'),
    albumCommentary: linkDirectory('albumCommentary'),
    artist: linkDirectory('artist', {color: false}),
    artistGallery: linkDirectory('artistGallery', {color: false}),
    commentaryIndex: linkIndex('commentaryIndex', {color: false}),
    flashIndex: linkIndex('flashIndex', {color: false}),
    flash: linkDirectory('flash'),
    groupInfo: linkDirectory('groupInfo'),
    groupGallery: linkDirectory('groupGallery'),
    home: linkIndex('home', {color: false}),
    listingIndex: linkIndex('listingIndex'),
    listing: linkDirectory('listing'),
    newsIndex: linkIndex('newsIndex', {color: false}),
    newsEntry: linkDirectory('newsEntry', {color: false}),
    staticPage: linkDirectory('staticPage', {color: false}),
    tag: linkDirectory('tag'),
    track: linkDirectory('track', {expose: 'data-track'}),

    media: linkPathname('media.path', {color: false}),
    root: linkPathname('shared.path', {color: false}),
    data: linkPathname('data.path', {color: false}),
    site: linkPathname('localized.path', {color: false})
};

export default link;
