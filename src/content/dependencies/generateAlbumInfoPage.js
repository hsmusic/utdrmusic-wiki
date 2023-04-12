export default {
  contentDependencies: [
    'generateAlbumInfoPageContent',
    'generateAlbumSocialEmbed',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generatePageLayout',
  ],

  extraDependencies: ['language'],

  relations(relation, album) {
    return {
      layout: relation('generatePageLayout'),

      content: relation('generateAlbumInfoPageContent', album),
      socialEmbed: relation('generateAlbumSocialEmbed', album),
      albumStyleRules: relation('generateAlbumStyleRules', album),
      colorStyleRules: relation('generateColorStyleRules', album.color),
    };
  },

  data(album) {
    return {
      name: album.name,
    };
  },

  generate(data, relations, {language}) {
    return relations.layout
      .slots({
        title: language.$('albumPage.title', {album: data.name}),
        styleRules: [
          relations.albumStyleRules,
          relations.colorStyleRules,
        ],

        cover: relations.content.cover,
        mainContent: relations.content.main.content,

        // socialEmbed: relations.socialEmbed,
      });
  },
};
