Blocks = new Meteor.Collection("blocks");
BlockTypes = new Meteor.Collection("blocktypes");
Scenes = new Meteor.Collection("scenes");

if (Meteor.isServer) {
  Blocks._ensureIndex({
    sceneId: 1,
    x: 1,
    y: 1,
    z: 1
  }, {unique: true});

  Blocks._ensureIndex({
    sceneId: 1
  });

  BlockTypes._ensureIndex({
    sceneId: 1
  });
}
