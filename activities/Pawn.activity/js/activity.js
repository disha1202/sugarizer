define(["sugar-web/activity/activity", "sugar-web/env", "sugar-web/graphics/icon", "webL10n","sugar-web/graphics/presencepalette", "sugar-web/datastore","sugar-web/graphics/journalchooser","pawnpalette","tutorial"], function (activity, env, icon, webL10n, presencepalette, datastore, journalchooser, pawnpalette, tutorial) {
	// Manipulate the DOM only when it is ready.
	requirejs(['domReady!'], function (doc) {

		// Initialize the activity.
		activity.setup();
		var currentenv;
		
		var isHost = false;
		env.getEnvironment(function(err, environment) {
			currentenv = environment;
			
            var defaultLanguage = (typeof chrome != 'undefined' && chrome.app && chrome.app.runtime) ? chrome.i18n.getUILanguage() : navigator.language;
            var language = environment.user ? environment.user.language : defaultLanguage;
            webL10n.language.code = language;

            if (!environment.objectId) {
                console.log("New instance");
            } else {
                activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
                    if (error==null && data!=null) {
                        pawns = JSON.parse(data);
                        drawPawns();
                    }
                });
            }
            if (environment.sharedId) {
                console.log("Shared instance");
                presence = activity.getPresenceObject(function(error, network) {
                    network.onDataReceived(onNetworkDataReceived);
                    network.onSharedActivityUserChanged(onNetworkUserChanged);
                });
            }
		});
		document.getElementById("help-button").addEventListener('click', function(e) {
			tutorial.start();
		});

		window.addEventListener("localized", function() {
			document.getElementById("user").innerHTML = "<h1>"+webL10n.get("Hello", {name:currentenv.user.name})+"</h1>";
			document.getElementById("add-button").title = webL10n.get("AddPawn");
		  });

		var onNetworkUserChanged = function(msg) {
            if (isHost) {
                console.log("sending pawns");
                presence.sendMessage(presence.getSharedInfo().id, {
                    user: presence.getUserInfo(),
                    content: {
                        action: 'init',
                        data: pawns
                    }
                });
            }
            console.log("User "+msg.user.name+" "+(msg.move == 1 ? "join": "leave"));
        };
		
        var onNetworkDataReceived = function(msg) {
            if (presence.getUserInfo().networkId === msg.user.networkId) {
                return;
            }
            switch (msg.content.action) {
                case 'init':
                    pawns = msg.content.data;
                    drawPawns();
                    break;
                case 'update':
                    pawns.push(msg.content.data);
                    drawPawns();
                    document.getElementById("user").innerHTML = "<h1>"+webL10n.get("Played", {name:msg.user.name})+"</h1>";
                    break;
            }
        };
		var pawns = [];
		var drawPawns = function() {
			document.getElementById("pawns").innerHTML = '';
			for (var i = 0 ; i < pawns.length ; i++) {
				var pawn = document.createElement("div");
				pawn.className = "pawn";

				document.getElementById("pawns").appendChild(pawn);
				icon.colorize(pawn, pawns[i]);
			}
		};
		
		var addpalette = new pawnpalette.PawnPalette(document.getElementById("add-button"), "Add pawn");
		addpalette.addEventListener('pawnClick', function (event) {
			for (var i = 0 ; i < event.count ; i++) {
				pawns.push(currentenv.user.colorvalue);
				drawPawns();
		
				document.getElementById("user").innerHTML = "<h1>"+webL10n.get("Played", {name:currentenv.user.name})+"</h1>";
		
				if (presence) {
					presence.sendMessage(presence.getSharedInfo().id, {
						user: presence.getUserInfo(),
						content: {
							action: 'update',
							data: currentenv.user.colorvalue
						}
					});
				}
			}
		});

		document.getElementById("stop-button").addEventListener('click', function (event) {
			console.log("writing...");
			var jsonData = JSON.stringify(pawns);
			activity.getDatastoreObject().setDataAsText(jsonData);
			activity.getDatastoreObject().save(function (error) {
				if (error === null) {
					console.log("write done.");
				} else {
					console.log("write failed.");
				}
			});
		});
		 var presence = null;
		 var palette = new presencepalette.PresencePalette(document.getElementById("network-button"), undefined);
		 palette.addEventListener('shared', function() {
			 palette.popDown();
			 console.log("Want to share");
			 presence = activity.getPresenceObject(function(error, network) {
				 if (error) {
					 console.log("Sharing error");
					 return;
				 }
				 network.createSharedActivity('org.sugarlabs.Pawn', function(groupId) {
					 console.log("Activity shared");
					 isHost=true;
				 });
				 network.onDataReceived(onNetworkDataReceived);
				 network.onSharedActivityUserChanged(onNetworkUserChanged);
			 });
		 });

		 document.getElementById("picture-button").addEventListener('click', function (e) {
			journalchooser.show(function (entry) {
				if (!entry) {
					return;
				}
				var dataentry = new datastore.DatastoreObject(entry.objectId);
				dataentry.loadAsText(function (err, metadata, data) {
					document.getElementById("canvas").style.backgroundImage = "url('"+data+"')";
				});
			}, { mimetype: 'image/png' }, { mimetype: 'image/jpeg' });
		});
	});

});
