// it's not possible to remove all without making a method
Meteor.methods({
  setSceneGroundTexture: function (sceneId, texture) {
    check(sceneId, String);
    check(texture, String);

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocks to frozen scene.");
    }

    Scenes.update({_id: sceneId},
    { $set: { groundTexture: texture } });
  },
  setSceneBackgroundTexture: function (sceneId, texture) {
    check(sceneId, String);
    check(texture, String);

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocks to frozen scene.");
    }

    Scenes.update({_id: sceneId},
    { $set: { backgroundTexture: texture } });
  },
  addBlockTypeToScene: function (sceneId, blockType) {
    check(sceneId, String);
    check(blockType, {
      color: String,
      texture: String,
      sizeX: Number,
      sizeY: Number,
      sizeZ: Number
    });

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocktypes to frozen scene.");
    }

    blockType.sceneId = sceneId;
    BlockTypes.insert(blockType);
  },
  addBlockToScene: function (sceneId, block) {
    check(sceneId, String);
    check(block, {
      blockTypeId: String,
      x: Number,
      y: Number,
      z: Number
    });

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocks to frozen scene.");
    }

    block.sceneId = sceneId;
    Blocks.insert(block);

    BlockTypes.update({_id: block.blockTypeId},
    { $inc: { counter: 1 } });
  },
  donateBlock: function (blockId) {
    check(blockId, String);

    var block = Blocks.findOne(blockId);
    if (!block) {
      throw new Meteor.Error(403, "Block doesn't exist.");
    }

    if (block.frozen) {
      throw new Meteor.Error(403, "Can't donate blocks to frozen scene.");
    }


    Blocks.update(
      { _id: blockId },
      { $set:
        {
          donated: true,
          donatedAt: new Date()
        }
      }
    );
  },
  removeBlockFromScene: function (sceneId, blockId) {
    check(sceneId, String);
    check(blockId, String);

    var block = Blocks.findOne(blockId);
    if (block.sceneId !== sceneId) {
      throw new Meteor.Error(403, "Block doesn't belong to this scene.");
    }

    var scene = Scenes.findOne(sceneId);
    if (! scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't remove blocks from frozen scene.");
    }

    Blocks.remove(blockId);
  },
  removeBlockTypeFromScene: function (sceneId, blockTypeId) {
    check(sceneId, String);
    check(blockTypeId, String);

    var blockType = BlockTypes.findOne(blockTypeId);
    if (blockType.sceneId !== sceneId) {
      throw new Meteor.Error(403, "Blocktype doesn't belong to this scene.");
    }

    var scene = Scenes.findOne(sceneId);
    if (! scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't remove blocktypes from frozen scene.");
    }

    BlockTypes.remove(blockTypeId);
  },
  clearBlocks: function (sceneId) {
    check(sceneId, String);

    var scene = Scenes.findOne(sceneId);
    if (! scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't remove blocks from frozen scene.");
    }

    Blocks.remove({sceneId: sceneId});
  },
  newScene: function () {
    var id = Scenes.insert({
      createdAt: new Date(),
      size: [30, 30]
      //backgroundColor: "#fff",
      //groundColor: "#4a9"
    });

    return id;
  },
  cloneScene: function (sceneId) {
    check(sceneId, String);

    var oldScene = Scenes.findOne(sceneId);

    if (! oldScene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    var dataToCopy = _.pick(oldScene, "backgroundColor", "groundColor");

    // make new scene
    var id = Scenes.insert(_.extend(dataToCopy, {
      createdAt: new Date(),
      clonedFrom: sceneId
    }));

    // get all old blocks
    var blocks = Blocks.find({sceneId: sceneId}).fetch();
    blocks.forEach(function (block) {
      delete block._id;
      block.sceneId = id;

      Blocks.insert(block);
    });

    return id;
  },
  freezeScene: function (sceneId, screenshot, viewpoint) {
    check(sceneId, String);
    check(screenshot, String);
    check(viewpoint, {
      orientation: [Number],
      position: [Number],
      centerOfRotation: [Number]
    });

    Scenes.update(
      { _id: sceneId },
      { $set:
        {
          frozen: true,
          viewpoint: viewpoint
        }
      }
    );

    Meteor.call("uploadScreenshot", sceneId, screenshot);
  },
  uploadScreenshot: function (sceneId, screenshot) {
    check(sceneId, String);
    check(screenshot, String);

    this.unblock();

    var result;

    // app should still run without Imgur enabled
    if (Config.imgurClientId) {
      try {
        result = HTTP.post("https://api.imgur.com/3/image",
          {
            params: {
              type: "base64",
              image: screenshot.split(",")[1],
              name: "thumbnail.png",
              title: "Meteor Blocks Thumbnail",
              description: "Thumbnail for " + Utils.linkToScene(sceneId)
            },
            headers: {
              Authorization: "Client-ID " + Config.imgurClientId
            }
          }
        );
      } catch (error) {
        // do nothing, we still have the Data URI
        console.log(error.stack);
      }
    }

    // replace Data URI with Imgur Link
    if (result && result.data && result.data.data && result.data.data.link) {
      screenshot = result.data.data.link;
    }

    Scenes.update(
      { _id: sceneId },
      { $set:
        {
          screenshot: screenshot
        }
      }
    );
  },
  log: function(arg) {
    console.log.apply(console, arg);
  }
});

Meteor.publish("scenes", function (sceneId) {
  check(sceneId, String);

  return Scenes.find({_id: sceneId});
});

Meteor.publish("frozenScenes", function () {
  return Scenes.find({frozen: true});
});

Meteor.publish("blocks", function (sceneId) {
  check(sceneId, String);

  if (sceneId) {
    return Blocks.find({sceneId: sceneId});
  } else {
    return [];
  }
});

Meteor.publish("blockTypes", function (sceneId) {
  check(sceneId, String);

  if (sceneId) {
    return BlockTypes.find({sceneId: sceneId});
  } else {
    return [];
  }
});
