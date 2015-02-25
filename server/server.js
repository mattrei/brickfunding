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
  setSceneGroundWidth: function (sceneId, width) {
    check(sceneId, String);
    check(width, Number);

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocks to frozen scene.");
    }

    Scenes.update({_id: sceneId},
    { $set: { groundWidth: width } });
  },
  setSceneGroundLength: function (sceneId, length) {
    check(sceneId, String);
    check(length, Number);

    var scene = Scenes.findOne(sceneId);
    if (!scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't add blocks to frozen scene.");
    }

    Scenes.update({_id: sceneId},
    { $set: { groundLength: length } });
  },
  addBlockTypeToScene: function (sceneId, blockType) {
    check(sceneId, String);
    check(blockType, {
      name: String,
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

    Scenes.update(
      {_id: sceneId},
      { $addToSet: { blockTypes: blockType } }
    );
  },
  addBlockToScene: function (sceneId, blockType, block) {
    check(sceneId, String);
    check(block, {
      rotX: Number,
      rotY: Number,
      rotZ: Number,
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

    console.log("adding " + blockType.name);
    Scenes.update(
      {_id: sceneId, "blockTypes.name": blockType.name},
      { $addToSet: { "blockTypes.$.blocks": block }}
    );
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
  removeBlockFromScene: function (sceneId, block) {
    check(sceneId, String);

    var scene = Scenes.findOne(sceneId);
    if (! scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't remove blocks from frozen scene.");
    }

    Scenes.update(
      {_id: sceneId , "blockTypes.blocks": block},
      { $pull: { "blockTypes.$.blocks": block } }
    );
  },
  removeBlockTypeFromScene: function (sceneId, blockType) {
    check(sceneId, String);

    var scene = Scenes.findOne(sceneId);
    if (! scene) {
      throw new Meteor.Error(403, "Scene doesn't exist.");
    }

    if (scene.frozen) {
      throw new Meteor.Error(403, "Can't remove blocktypes from frozen scene.");
    }

    Scenes.update(
      {_id: sceneId},
      { $pull: { blockTypes: blockType } }
    );
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
      groundWidth: 30,
      groundLength: 30
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

/*
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
*/
