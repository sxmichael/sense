(function () {
   var global = window;

   var history_viewer, history_popup;

   function getHistory() {
      $.ajax({
         url: $("#es_server").val() + '/sense/_search?sort=name:asc',
         data: JSON.stringify(data),
         type: type,
         dataType: "json",
         success: function() {
             console.log("Editor content saved with id: " + sense.history.id);
         }
      });
   }

   function getHistoricalServers() {
      return [];
   }

   function populateHistElem(hist_elem) {
      var s = (hist_elem.data || "");
      history_viewer.setValue(s);
      history_viewer.clearSelection();
   }

   function applyHistElem(hist_elem) {
      var session = sense.editor.getSession();
      var pos = sense.editor.getCursorPosition();
      var prefix = "";
      var suffix = "\n";
      if (sense.utils.isStartRequestRow(pos.row)) {
         pos.column = 0;
         suffix += "\n";
      }
      else if (sense.utils.isEndRequestRow(pos.row)) {
         var line = session.getLine(pos.row);
         pos.column = line.length;
         prefix = "\n\n";
      }
      else if (sense.utils.isInBetweenRequestsRow(pos.row)) {
         pos.column = 0;
      }
      else {
         pos = sense.utils.nextRequestEnd(pos);
         prefix = "\n\n";
      }

      var s = prefix;
      if (hist_elem.data) s += "\n" + hist_elem.data;

      s += suffix;

      session.insert(pos, s);
      sense.editor.clearSelection();
      sense.editor.moveCursorTo(pos.row + prefix.length, 0);
      sense.editor.focus();
   }

   function init() {
      history_popup = $("#history_popup");

      history_popup.on('shown', function () {
         _gaq.push(['_trackEvent', "history", 'shown']);
         $('<div id="history_viewer">No history available</div>').appendTo(history_popup.find(".modal-body"));

         history_viewer = ace.edit("history_viewer");
         history_viewer.getSession().setMode("ace/mode/sense");
//         history_viewer.setTheme("ace/theme/monokai");
         history_viewer.getSession().setFoldStyle('markbeginend');
         history_viewer.setReadOnly(true);
         history_viewer.renderer.setShowPrintMargin(false);
         sense.editor.getSession().setUseWrapMode(true);

         $.ajax({
            url: $("#es_server").val() + '/sense/_search?sort=name:asc',
            type: 'GET',
            dataType: "json",
            success: function(result) {
               hits = result.hits.hits;
               for(var i = 0; i < hits.length; i++) {
                  var hist_elem = hits[i]._source;
                  var li = $('<li><a href="#"><i class="icon-chevron-right"></i><span/></a></li>');
                  var disc = hist_elem.name;
                  var date = moment(hist_elem.time);
                  if (date.diff(moment(), "days") < -7)
                     disc += " (" + date.format("MMM D") + ")";
                  else
                     disc += " (" + date.fromNow() + ")";

                  li.find("span").text(disc);
                  li.attr("title", disc);

                  li.find("a").click(function () {
                     history_popup.find('.modal-body .nav li').removeClass("active");
                     li.addClass("active");
                     populateHistElem(hist_elem);
                     return false;
                  });

                  li.dblclick(function () {
                     li.addClass("active");
                     history_popup.find(".btn-primary").click();
                  });

                  li.hover(function () {
                     populateHistElem(hist_elem);
                     return false;
                  }, function () {
                     history_popup.find(".modal-body .nav li.active a").click();
                  });

                  li.bind('apply', function () {
                     _gaq.push(['_trackEvent', "history", 'applied']);
                     applyHistElem(hist_elem);
                  });


                  li.appendTo(history_popup.find(".modal-body .nav"));
               }
            }
         });
         
         history_popup.find(".modal-body .nav li:first a").click();
      });

      history_popup.on('hidden', function () {
         history_popup.find('.modal-body #history_viewer').remove();
         history_popup.find('.modal-body .nav li').remove();
         history_viewer = null;
      });

      history_popup.find(".btn-primary").click(function () {
         history_popup.find(".modal-body .nav li.active").trigger("apply");
      });
   }

   function addToHistory() {
      try {
        var history_name_popup = $("#history_name_popup");
        history_name_popup.modal();

        history_name_popup.on('shown', function () {
           $("#history_name").val(sense.history.name);
           $('#history_name').focus();
           $('#history_name').select();
        });

        $('#save_history').click(function() {
           var historyName = $("#history_name").val();
           sense.history.name = historyName;

           if (!historyName) {
              console.log("history name is empty"); 
              return;
           }
           
           $("#history_name_popup").modal('hide');

           var data = sense.editor.getValue();

           var type = 'PUT';
           if(!sense.history.id) {
               sense.history.id = generateUUID();
               type = 'POST';
           }

           var timestamp = new Date().getTime();
           var index = {
               "name" : historyName,
               'time': timestamp,
               'data': data
           };

           $.ajax({
               url: $("#es_server").val() + '/sense/query/' + sense.history.id,
               data: JSON.stringify(index),
               type: type,
               dataType: "json",
               success: function() {
                   console.log("Editor content saved with id: " + sense.history.id);
               }
           });
        });
      }
      catch (e) {
         console.log("Ignoring saving error: " + e)
      }
   }

   function saveCurrentEditorState(server, content) {
   }

   function getSavedEditorState(server, content) {
   }

   function generateUUID(){
       var d = new Date().getTime();
       var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           var r = (d + Math.random()*16)%16 | 0;
           d = Math.floor(d/16);
           return (c=='x' ? r : (r&0x7|0x8)).toString(16);
       });
       return uuid;
   };

   global.sense.history = {
      init: init,
      id : "",
      name : "",
      addToHistory: addToHistory,
      getHistoricalServers: getHistoricalServers,
      saveCurrentEditorState: saveCurrentEditorState,
      getSavedEditorState: getSavedEditorState
   };
})();





