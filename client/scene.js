var blockTextures = _.values({
  brick1: "block/brick1.jpg",
  brick2: "block/brick2.jpg",
  stone1: "block/stone1.jpg",
});

var groundTextures = _.values({
  grass1: "ground/grass1.jpg",
  grass2: "ground/grass2.jpg"
});
var backgroundTextures = _.values({
  skyblock1: "ground/grass1.jpg"
});

Meteor.log = function() {
  Meteor.call('log', arguments);
};

Session.setDefault("groundWidth", 30);
Session.setDefault("groundHeight", 30);
//Session.setDefault("groundTexture", groundTextures[0]);
//Session.setDefault("backgroundTexture", backgroundTextures[0]);

Session.setDefault("blockTexture", blockTextures[0]);
Session.setDefault("blockOrientation", false);

Template.controls.helpers({
  frozen: Utils.frozen,
  sceneId: function () {
    return Session.get("sceneId");
  },
  sceneUrl: function () {
    return Utils.linkToScene(Session.get("sceneId"));
  },
  createdAt: function () {
    return Utils.currentScene() && moment(Utils.currentScene().createdAt).calendar();
  },
  groundTextures: groundTextures,
  backgroundTextures: backgroundTextures,
  activeTexture: function () {
    if (Session.equals("scenePickerTab", "ground")) {
      return this.valueOf() === Utils.currentScene().groundTexture;
    } else if (Session.equals("scenePickerTab", "background")) {
      return this.valueOf() === Utils.currentScene().backgroundTexture;
    } else {
      return this.valueOf() === Session.get("blockTexture");
    }
  },
  screenshot: function () {
    return Utils.currentScene().screenshot;
  },
  showFacebookButton: function () {
    // check for Facebook API
    return !! FB;
  },
  scenePickerTabIs: function (tabName) {
    return (Session.get("scenePickerTab") || "ground") === tabName;
  },
  blockTabIs: function (tabName) {
    return (Session.get("blockTab") || "texture") === tabName;
  },
  blockinfo: function() {
    return Session.get("blockinfo");
    //return Utils.hoveredBlock().target.nodeName;
  }
});

Template.blocktype.helpers({
  blockTextures: blockTextures,
  blockTypes: function() {
    return BlockTypes.find({"sceneId": Session.get("sceneId")});
  },
  activeBlockType: function () {
    return this.valueOf()._id === Session.get("blockType")._id;
  },
  activeTexture: function () {
    return this.valueOf() === Session.get("blockTexture");
  }
});

Template.blocktype.events({

  "click button.remove-blocktype": function (event) {
    event.preventDefault();
    var blockTypeId = event.target.getAttribute("data-blocktype");
    Meteor.call("removeBlockTypeFromScene",
      Session.get("sceneId"), blockTypeId);
  },
  "submit .new-blocktype": function (event) {
    event.preventDefault(); // prevent from submitting
    if (!Utils.frozen()) {

      var blockType = {
        color: "#fff",
        texture: Session.get("blockTexture"),
        sizeX: parseInt(event.target.length.value),
        sizeY: parseInt(event.target.height.value),
        sizeZ: parseInt(event.target.width.value)
      };

      console.log(blockType);

      Meteor.call("addBlockTypeToScene", Session.get("sceneId"), blockType);
    }
  },
  "click .blocktype-picker-content .swatch": function () {
    console.log(this.valueOf());
    Session.set("blockType", this.valueOf());
  },
  "click .texture-picker-content .swatch": function () {
    Session.set("blockTexture", this.valueOf());
  },
});

Template.controls.events({

  "click .clear-blocks": function () {
    Meteor.call("clearBlocks", Session.get("sceneId"));
  },
  "click .texture-picker .swatch": function () {
    var sceneId = Session.get("sceneId");
    if (Session.equals("scenePickerTab", "ground")) {
      Meteor.call("setSceneGroundTexture", sceneId, this.valueOf());
    } else if (Session.equals("scenePickerTab", "background")) {
      Meteor.call("setSceneBackgroundTexture", sceneId, this.valueOf());
    }
  },
  "click .orientate-block": function (e) {
    var sceneId = Session.get("sceneId");
    if (Session.equals("blockTab", "orientation")) {
      Session.set("blockOrientation", ! Session.get("blockOrientation"));
    }
  },
  "click button.freeze": function () {
    savedViewpoint = Session.get("currentViewpoint");

    var o = savedViewpoint.orientation;
    var p = savedViewpoint.position;
    var c = savedViewpoint.centerOfRotation;

    viewpoint = {
      orientation: [o[0].x, o[0].y, o[0].z, o[1]],
      position: [p.x, p.y, p.z],
      centerOfRotation: [c.x, c.y, c.z]
    };

    Meteor.call("freezeScene", Session.get("sceneId"),
      Utils.getScreenshot(), viewpoint);
  },
  // XXX add more loading indicators
  "click button.clone": function () {
    Session.set("loading", true);
    Meteor.call("cloneScene", Session.get("sceneId"), function (error, newId) {
      if (newId) {
        Router.navigate("/scene/" + newId, { trigger: true });
      }
    });
  },
  "click .texture-picker .nav-tabs a": function (event) {
    event.preventDefault();
    var tabName = event.target.getAttribute("data-tab-name");
    Session.set("scenePickerTab", tabName);
  },
  "click .block-picker .nav-tabs a": function (event) {
    event.preventDefault();
    var tabName = event.target.getAttribute("data-tab-name");
    Session.set("blockTab", tabName);
  },
  "click .facebook": function () {
    shareOnFacebook(Session.get("sceneId"));
  },
  "change #sliderWidth": function () {
    console.log(this.valueOf());
    Session.set("sceneWidth", this.valueOf());
  },
  "change #sliderHeight": function () {
    console.log(this);
    Session.set("sceneHeight", this.valueOf());
  }
});

Template.scene.helpers({
  blocks: function () {
    return Blocks.find({"sceneId": Session.get("sceneId")});
  },
  groundTexture: function () {
    return Utils.currentScene().groundTexture || groundTextures[0];
  },
  groundSize: function () {
    var scene = Utils.currentScene();

    if (scene && scene.size) {
      return scene.size.join(" ");
    } else {
      return "30 30";
    }
  },
  /*
  x3dGroundColor: function () {
    // take into account old scenes with no background color
    var colorString = Utils.currentScene().groundColor || "#4A9";
    var parsed = parseCSSColor(colorString);
    return "" + parsed[0]/255 + " " + parsed[1]/255 + " " + parsed[2]/255;
  },
  */
  x3dBackgroundColor: function () {
    // take into account old scenes with no background color
    var colorString = Utils.currentScene().backgroundColor || "#fff";
    var parsed = parseCSSColor(colorString);
    return "" + parsed[0]/255 + " " + parsed[1]/255 + " " + parsed[2]/255;
  },
  x3dOrientation: function () {
    var scene = Utils.currentScene();

    if (scene && scene.viewpoint && scene.viewpoint.orientation) {
      return scene.viewpoint.orientation.join(" ");
    } else {
      return "-0.834 0.55 0 0.65";
    }
  },
  x3dPosition: function () {
    var scene = Utils.currentScene();

    if (scene && scene.viewpoint && scene.viewpoint.position) {
      return scene.viewpoint.position.join(" ");
    } else {
      return "8.19 12.33 19.5";
    }
  },
  x3dCenterOfRotation: function () {
    var scene = Utils.currentScene();

    if (scene && scene.viewpoint && scene.viewpoint.centerOfRotation) {
      return scene.viewpoint.centerOfRotation.join(" ");
    } else {
      return "0 0 0";
    }
  }
});

// method stub for faster performance on the frontend
Meteor.methods({
  addBlockToScene: function (sceneId, block) {
    block.sceneId = sceneId;
    Blocks.insert(block);
  },
  addBlockTypeToScene: function (sceneId, blockType) {
    blockType.sceneId = sceneId;
    BlockTypes.insert(blockType);
  },
  removeBlockFromScene: function (sceneId, blockId) {
    Blocks.remove(blockId);
  },
  removeBlockTypeFromScene: function (sceneId, blockTypeId) {
    BlockTypes.remove(blockTypeId);
  },
  freezeScene: function (sceneId, screenshot, viewpoint) {
    Scenes.update(
      { _id: sceneId },
      { $set:
        {
          frozen: true,
          screenshot: screenshot,
          viewpoint: viewpoint
        }
      }
    );
  },
  setSceneGroundTexture: function (sceneId, texture) {
    Scenes.update({_id: sceneId},
    { $set: { groundTexture: texture } });
  },
  setSceneBackgroundColor: function (sceneId, texture) {
    Scenes.update({_id: sceneId},
    { $set: { backgroundTexture: texture } });
  }
});

// how many pixels has the mouse been dragged since last mousedown
// used to determine if we should place a block or not
var dragged = 0;

UI.body.events({
  "mousedown x3d": function () {
    dragged = 0;
  },
  "mousemove x3d": function () {
    dragged += 1;
  },
});

Template.scene.events({
  "mouseup shape": function (event) {
    if (!Utils.frozen() && dragged < 5) {
      if (event.button === 1) {

        var blockType = Session.get("blockType");
        console.log(blockType);

        // calculate new block position based on location of click event
        // in 3d space and the normal of the surface that was clicked
        var block = {
          blockTypeId: blockType._id,
          x: Math.floor(event.worldX + event.normalX / 2) + 0.5 * blockType.sizeX,
          y: Math.floor(event.worldY + event.normalY / 2) + 0.5 * blockType.sizeY,
          z: Math.floor(event.worldZ + event.normalZ / 2) + 0.5 * blockType.sizeZ,
/*
          x: Math.floor(event.worldX + event.normalX / 2) + 0.5,
          y: Math.floor(event.worldY + event.normalY / 2) + 0.5,
          z: Math.floor(event.worldZ + event.normalZ / 2) + 0.5
*/
        };

        Meteor.call("addBlockToScene", Session.get("sceneId"), block);
      } else if (event.button === 2) {
        // right click to remove block
        Meteor.call("removeBlockFromScene",
          Session.get("sceneId"), event.currentTarget.id);
      } else if (event.button === 4) {
        Meteor.call("donateBlock", event.currentTarget.id);
      }
    }
  },
  "mouseover shape": function (event) {

    var el = _.pick(event, ["target"]);
    if (el && el.target.nodeName != "PLANE") {
      //console.log(event);
      Session.set("blockinfo", event.currentTarget.id);
    } else {
      Session.set("blockinfo", 'no');
    }
  },
  "viewpointChanged viewpoint": function (event) {
    Session.set("currentViewpoint", _.pick(event,
      ["orientation", "position", "centerOfRotation"]));
  }
});
