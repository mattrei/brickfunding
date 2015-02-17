// colors from https://github.com/mrmrs/colors/blob/master/less/_variables.less
var colors = _.values({
  // Cool
  aqua: "#7FDBFF",
  blue: "#0074D9",
  navy: "#001F3F",
  teal: "#39CCCC",
  green: "#2ECC40",
  olive: "#3D9970",
  lime:  "#01FF70",

  // Warm
  yellow:  "#FFDC00",
  orange:  "#FF851B",
  red:     "#FF4136",
  fuchsia: "#F012BE",
  purple:  "#B10DC9",
  maroon:  "#85144B",

  // Gray Scale
  white:  "#fff",
  silver: "#ddd",
  gray:   "#aaa",
  black:  "#111",

  // Browns (for natural scenes)
  brown1: "#A64300",
  brown2: "#BF6A30",
  brown3: "#A66A00"
});

Session.setDefault("color", "#7FDBFF");

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
  // list of colors for color picker
  colors: colors,
  // active color helper for color picker
  activeColor: function () {
    if (Session.equals("colorPickerTab", "ground")) {
      return this.valueOf() === Utils.currentScene().groundColor;
    } else if (Session.equals("colorPickerTab", "background")) {
      return this.valueOf() === Utils.currentScene().backgroundColor;
    } else {
      return this.valueOf() === Session.get("color");
    }
  },
  screenshot: function () {
    return Utils.currentScene().screenshot;
  },
  showFacebookButton: function () {
    // check for Facebook API
    return !! FB;
  },
  colorPickerTabIs: function (tabName) {
    return (Session.get("colorPickerTab") || "block") === tabName;
  },
  boxinfo: function() {
    return Session.get("boxinfo");
    //return Utils.hoveredBox().target.nodeName;
  }
});

Template.controls.events({
  "click .clear-boxes": function () {
    Meteor.call("clearBoxes", Session.get("sceneId"));
  },
  "click .swatch": function () {
    var sceneId = Session.get("sceneId");
    if (Session.equals("colorPickerTab", "ground")) {
      Meteor.call("setSceneGroundColor", sceneId, this.valueOf());
    } else if (Session.equals("colorPickerTab", "background")) {
      Meteor.call("setSceneBackgroundColor", sceneId, this.valueOf());
    } else {
      Session.set("color", this.valueOf());
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
  "click .color-picker .nav-tabs a": function (event) {
    event.preventDefault();
    var tabName = event.target.getAttribute("data-tab-name");
    Session.set("colorPickerTab", tabName);
  },
  "click .facebook": function () {
    shareOnFacebook(Session.get("sceneId"));
  }
});

Template.scene.helpers({
  boxes: function () {
    return Boxes.find({"sceneId": Session.get("sceneId")});
  },
  groundColor: function () {
    // take into account old scenes with no ground color
    return Utils.currentScene().groundColor || "#4A9";
  },
  x3dGroundColor: function () {
    // take into account old scenes with no background color
    var colorString = Utils.currentScene().groundColor || "#4A9";
    var parsed = parseCSSColor(colorString);
    return "" + parsed[0]/255 + " " + parsed[1]/255 + " " + parsed[2]/255;
  },
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
  addBoxToScene: function (sceneId, box) {
    box.sceneId = sceneId;
    Boxes.insert(box);
  },
  removeBoxFromScene: function (sceneId, boxId) {
    Boxes.remove(boxId);
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
  setSceneGroundColor: function (sceneId, color) {
    Scenes.update({_id: sceneId},
    { $set: { groundColor: color } });
  },
  setSceneBackgroundColor: function (sceneId, color) {
    Scenes.update({_id: sceneId},
    { $set: { backgroundColor: color } });
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
        // calculate new box position based on location of click event
        // in 3d space and the normal of the surface that was clicked
        var box = {
          color: Session.get("color"),
          x: Math.floor(event.worldX + event.normalX / 2) + 0.5,
          y: Math.floor(event.worldY + event.normalY / 2) + 0.5,
          z: Math.floor(event.worldZ + event.normalZ / 2) + 0.5
        };

        Meteor.call("addBoxToScene", Session.get("sceneId"), box);
      } else if (event.button === 4 || event.button === 2) {
        // right click to remove box
        Meteor.call("removeBoxFromScene",
          Session.get("sceneId"), event.currentTarget.id);
      }
    }
  },
  "mouseover shape": function (event) {

    var el = _.pick(event, ["target"]);
    if (el && el.target.nodeName != "PLANE") {
      console.log(el.target.nodeName);
      Session.set("boxinfo", el.target.nodeName);
    } else {
      Session.set("boxinfo", 'no');
    }
  },
  "mouseclick": function (event) {
    console.log(event);
  },
  "viewpointChanged viewpoint": function (event) {
    //console.log(_.pick(event, ["orientation", "position", "centerOfRotation"]));
    Session.set("currentViewpoint", _.pick(event,
      ["orientation", "position", "centerOfRotation"]));
  }
});
