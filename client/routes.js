var triggerGoogleAnalytics = function () {
  if (window.ga) {
    ga('send', 'pageview', window.location.origin + window.location.hash);
  }
};

var RouterClass = Backbone.Router.extend({
  routes: {
    "": "home",
    "scene/:_id": "scene",
    "all": "all"
  },

  home: function () {
    triggerGoogleAnalytics();
    Session.set("sceneId", null);
    Session.set("showAll", false);

    Meteor.subscribe("frozenScenes");
  },

  scene: function (sceneId) {
    triggerGoogleAnalytics();
    var self = this;

    Session.set("loading", true);

    // XXX this method can cause inconsistency between Session and subscription
    // status
    Meteor.subscribe("scenes", sceneId, function () {
      // when the subscribe completes, check if the ID in the session is
      // a real ID; if it's not reset to the home page
      var scene = Scenes.findOne(sceneId);
      if (scene) {
        // we did good, set the ID in the session
        if (! Session.get("mode") && ! Utils.currentScene().frozen) {
          // set default mode
          Session.set("mode", "build");
        }
        Session.set("sceneId", sceneId);

        console.log("created scene");
        console.log(scene);

        Meteor.subscribe("blockTypes", sceneId, function () {
        });
        Meteor.subscribe("blocks", sceneId, function () {
        });


        Session.set("groundWidth", scene.groundWidth);
        Session.set("groundLength", scene.groundLength);

        Session.set("loading", false);
      } else {
        self.navigate("");
      }
    });
  },

  all: function () {
    triggerGoogleAnalytics();
    Session.set("sceneId", null);
    Session.set("showAll", true);

    Meteor.subscribe("frozenScenes");
  }
});

Router = new RouterClass();
Backbone.history.start();
