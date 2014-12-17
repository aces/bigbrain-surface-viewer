/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011 McGill University
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
* Author: Tarek Sherif  <tsherif@gmail.com> (http://tareksherif.ca/)
* Author: Nicolas Kassis
*/

// This script is meant to be a demonstration of how to
// use most of the functionality available in the
// BrainBrowser Surface Viewer.
$(function() {
  "use strict";

  // Request variables used to cancel the current request
  // if another request is started.
  var current_request = 0;
  var current_request_name = "";

  // Hide or display loading icon.
  var loading_div = $("#loading");
  function showLoading() { loading_div.show(); }
  function hideLoading() { loading_div.hide(); }
  

  // Make sure WebGL is available.
  if (!BrainBrowser.utils.webglEnabled()) {
    $("#brainbrowser").html(BrainBrowser.utils.webGLErrorMessage());
    return;
  }

  /////////////////////////////////////
  // Start running the Surface Viewer
  /////////////////////////////////////
  window.viewer = BrainBrowser.SurfaceViewer.start("brainbrowser", function(viewer) {

    var picked_object;
    var atlas_labels = {};
    var autoshapes  = [];
    var selected_object = "none";
    var focus_toggle = "off";
    var opacity_toggle_custom = "off";
    var opacity_toggle_onoff = "none";
    var opacity_toggle_indiv_onoff = {};
    var slider_backup = {};
    var searchindex= "" ;

    // Add the three.js 3D anaglyph effect to the viewer.
    viewer.addEffect("AnaglyphEffect");

    // Set up some defaults
    viewer.setAttribute("clamp_colors", true); // By default clamp range.
    viewer.setAttribute("flip_colors", false); // Don't flip intensity-color relationship.

    ///////////////////////////////////
    // Event Listeners
    ///////////////////////////////////

    // If something goes wrong while loading, we don't
    // want the loading icon to stay on the screen.
    BrainBrowser.events.addEventListener("error", hideLoading);

    // When a new color map is loaded display a spectrum representing
    // the color mapping.
    viewer.addEventListener("loadcolormap", function(color_map) {
      var canvas = color_map.createCanvasWithScale(0, 100);
      var spectrum_div = document.getElementById("color-bar");
      
      canvas.id = "spectrum-canvas";
      if (!spectrum_div) {
        $("<div id=\"color-bar\"></div>").html(canvas).appendTo("#data-range-box");
      } else {
        $(spectrum_div).html(canvas);
      }
    });

    // When a new model is added to the viewer, create a transparancy slider
    // for each shape that makes up the model.
    viewer.addEventListener("displaymodel", function(object) {
      var slider, slider_div, slider_div_end;
      var children = object.children;
      var current_count = $("#shapes").children().length;

      if(children.length - current_count > 0 ) {
        children.slice(current_count).forEach(function(shape, i) {
          slider_div = $("<div id=\"shape-" + i + "\" class=\"shape\">" +
            "<h4> <p class=\"alignleft\"> Shape " + (i + 1 + current_count) + "</p></h4>" + 
	    "<div id=\"top-" + i + "\" style=\"visibility: hidden\"><a href=\"#surface-choice\"><p class=\"alignright\">back to top</a></p></div><br />" +
            "<div style=\"clear: both;\">" +
            "Name: " + shape.name + "<br />" +
            "<p class=\"alignleft\"> Opacity: </p></div>");
          slider = $("<div class=\"opacity-slider aligncenter slider\" data-shape-name=\"" + shape.name + "\">");
	  slider_div_end = $("<div id=\"test\"><p class=\"alignright\"><a class=\"button\" id=\"individualtoggleopacity" +  i + "\">On</a></p></div>");
          slider.slider({
            value: 100,
            min: -1,
            max: 101,
            slide: function(event) {
              var target = event.target;
              var shape_name = $(target).attr('data-shape-name');
              var alpha = $(target).slider('value');
              alpha = Math.min(100, Math.max(0, alpha)) / 100.0;

              viewer.setTransparency(alpha, {
                shape_name: shape_name
              });
            }
          });

          slider_div_end.appendTo(slider_div);
          slider.appendTo(slider_div);
          slider_div.appendTo("#shapes");
	  autoshapes[i]={};
	  autoshapes[i].label = shape.name;
          opacity_toggle_indiv_onoff[i] = "on";
          $("#individualtoggleopacity" + i).click(function() {
	    if (opacity_toggle_indiv_onoff[i] == "on"){
              viewer.setTransparency(0, {shape_name: shape.name});
              $(".opacity-slider[data-shape-name='" + shape.name + "']").slider("value", 0);
	      opacity_toggle_indiv_onoff[i] = "off";
              $(this).html("Off");
	    } else {
              viewer.setTransparency(1, {shape_name: shape.name});
              $(".opacity-slider[data-shape-name='" + shape.name + "']").slider("value", 100);
              opacity_toggle_indiv_onoff[i] = "on";
              $(this).html("On");
	    }
          });
        });
      }

      $("#searchshapes").autocomplete({
        source: autoshapes
      }).autocomplete("widget").addClass("fixed-height");
    });

    // When the screen is cleared, remove all UI related
    // to the displayed models.
    viewer.addEventListener("clearscreen", function() {
      $("#shapes").html("");
      $("#pick-name").html("");
      $("#pick-shape-number").html("");
      $("#pick-x").html("");
      $("#pick-y").html("");
      $("#pick-z").html("");
      $("#pick-index").html("");
      $("#pick-value").html("");
    });

    // When the intensity range changes, adjust the displayed spectrum.
    viewer.addEventListener("changeintensityrange", function(intensity_data) {
      var canvas = viewer.color_map.createCanvasWithScale(intensity_data.range_min, intensity_data.range_max);
      canvas.id = "spectrum-canvas";
      $("#color-bar").html(canvas);
    });

    // When new intensity data is loaded, create all UI related to
    // controlling the relationship between the instensity data and
    // the color mapping (range, flip colors, clamp colors, fix range).
    viewer.addEventListener("loadintensitydata", function(intensity_data) {
      var container = $("#data-range");
      var headers = '<div id="data-range-multiple"><ul>';
      var controls = "";
      var i, count;
      var data_set = Array.isArray(intensity_data) ? intensity_data : [intensity_data];
      var model_data = viewer.model_data.get();

      container.html("");
      for(i = 0, count = data_set.length; i < count; i++) {
        headers += '<li><a href="#data-file' + i + '">' + data_set[i].filename + '</a></li>';
        controls += '<div id="data-file' + i + '" class="box range-controls">';
        controls += 'Min: <input class="range-box" id="data-range-min" type="text" name="range-min" size="5" >';
        controls += '<div id="range-slider' + i + '" data-blend-index="' + i + '" class="slider"></div>';
        controls += 'Max: <input class="range-box" id="data-range-max" type="text" name="range-max" size="5">';
        controls += '<div style="margin-top: 10px">';
        controls += '<input type="checkbox" class="button" id="fix-range"' +
                    (viewer.getAttribute("fix_color_range") ? ' checked="true"' : '') +
                    '><label for="fix-range">Fix Range</label>\n';
        controls += '<input type="checkbox" class="button" id="clamp-range"' +
                    (viewer.getAttribute("clamp_colors") ? ' checked="true"' : '') +
                    '><label for="clamp-range">Clamp range</label>\n';
        controls += '<input type="checkbox" class="button" id="flip-range"' +
                    (viewer.getAttribute("flip_colors") ? ' checked="true"' : '') +
                    '><label for="flip-range">Flip Colors</label>\n';
        controls += '</div>';
        controls += '</div>';
      }
      headers += "</ul>";


      container.html(headers + controls + "</div>");
      $("#data-range-box").show();
      $("#color-map-box").show();
      container.find("#data-range-multiple").tabs();

      container.find(".range-controls").each(function(index, element) {
        var controls = $(element);
        var intensity_data = data_set[index];

        var data_min = BrainBrowser.utils.min(intensity_data.values);
        var data_max = BrainBrowser.utils.max(intensity_data.values);
        var range_min = intensity_data.range_min;
        var range_max = intensity_data.range_max;

        var min_input = controls.find("#data-range-min");
        var max_input = controls.find("#data-range-max");
        var slider = controls.find(".slider");

        slider.slider({
          range: true,
          min: data_min,
          max: data_max,
          values: [range_min, range_max],
          step: (range_max - range_min) / 100.0,
          slide: function(event, ui) {
            var min = ui.values[0];
            var max = ui.values[1];
            min_input.val(min);
            max_input.val(max);
            intensity_data.range_min = min;
            intensity_data.range_max = max;
            viewer.model_data.intensity_data = intensity_data;
            viewer.setIntensityRange(min, max);
          }
        });

        slider.slider('values', 0, parseFloat(range_min));
        slider.slider('values', 1, parseFloat(range_max));
        min_input.val(range_min);
        max_input.val(range_max);

        function inputRangeChange() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());
          
          slider.slider('values', 0, min);
          slider.slider('values', 1, max);
          viewer.setIntensityRange(min, max, controls.find("#clamp-range").is(":checked"));
        }

        $("#data-range-min").change(inputRangeChange);
        $("#data-range-max").change(inputRangeChange);

        $("#fix-range").click(function() {
          viewer.setAttribute("fix_color_range", $(this).is(":checked"));
        });

        $("#clamp-range").change(function() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());

          viewer.setAttribute("clamp_colors", $(this).is(":checked"));

          viewer.setIntensityRange(min, max);
        });


        $("#flip-range").change(function() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());

          viewer.setAttribute("flip_colors", $(this).is(":checked"));

          viewer.setIntensityRange(min, max);
        });

        viewer.triggerEvent("changeintensityrange", intensity_data);
      });

      $("#paint-value").val(model_data.intensity_data.values[0]);
      $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(model_data.intensity_data.values[0], {
        format: "hex",
        min: model_data.intensity_data.range_min,
        max: model_data.intensity_data.range_max
      }));

    }); // end loadintensitydata listener
    
    // If two color maps are loaded to be blended, create
    // slider to control the blending ratios.
    viewer.addEventListener("blendcolormaps", function(){
      var div = $("#blend-box");
      var blend_text = $("<span id=\"blend-value\">0.5</span>");

      div.html("Blend Ratio: ");
      blend_text.appendTo(div);
      $("<div class=\"blend-slider\" id=\"blend-slider\" width=\"100px\" + height=\"10\"></div>").slider({
        min: 0.1,
        max: 0.99,
        value: 0.5,
        step: 0.01,
        slide: function() {
          var value = $(this).slider("value");
          viewer.blend(value);
          blend_text.html(value);
        }
      }).appendTo(div);
    });

    // Update the colors displayed to match the current color mapping.
    viewer.addEventListener("updatecolors", function() {
      var value = parseFloat($("#pick-value").val());
      var model_data = viewer.model_data.get();

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#pick-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          format: "hex",
          min: model_data.intensity_data.range_min,
          max: model_data.intensity_data.range_max
        }));
      }

      value = parseFloat($("#paint-value").val());

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          format: "hex",
          min: model_data.intensity_data.range_min,
          max: model_data.intensity_data.range_max
        }));
      }

    });

    // If intensity data is updated, show link to download new intensity values.
    viewer.addEventListener("updateintensitydata", function(data) {
      var link = $("#intensity-data-export-link");

      link.attr("href", BrainBrowser.utils.createDataURL(data.values.join("\n")));
      $("#intensity-data-export-link").attr("download", "intensity-values.txt");
      $("#intensity-data-export").show();
    });

    ////////////////////////////////////
    //  START RENDERING
    ////////////////////////////////////
    viewer.render();

    // Load a color map (required for displaying intensity data).
    // viewer.loadColorMapFromURL(BrainBrowser.config.get("color_maps")[0].url);

    ///////////////////////////////////
    // UI
    ///////////////////////////////////

    // Set the background color.
    $("#clear-color").change(function(e){
      viewer.setClearColor(parseInt($(e.target).val(), 16));
    });
    
    // Reset to the default view.
    $("#resetview").click(function() {
      // Setting the view to its current view type will
      // automatically reset its position and opacity is reset to 100% for all shapes.
      viewer.setView($("[name=hem-view]:checked").val());
        viewer.model.children.forEach(function(child) {
          viewer.setTransparency(1, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
        });
    });

    // Toggle opacity (custom vs. on).
    $("#toggleopacitycustom").click(function() {

      viewer.model.children.forEach(function(child) {

        if (  opacity_toggle_custom == "off") {
          slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
          viewer.setTransparency(1, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
        } else {
          var alpha = slider_backup[child.name] / 100;
          viewer.setTransparency(alpha, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", slider_backup[child.name]);
	}
      });
      if (  opacity_toggle_custom == "off") {
	opacity_toggle_custom = "on";
      } else {
        opacity_toggle_custom = "off";
      }
    });

    // Toggle opacity (on vs. off).
    $("#toggleopacityonoff").click(function() {

      viewer.model.children.forEach(function(child) {

        if (  opacity_toggle_onoff == "all") {
          slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
          viewer.setTransparency(1, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
        } else {
          viewer.setTransparency(0, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
        }
      });
      if (  opacity_toggle_onoff == "all") {
        opacity_toggle_onoff = "none";
      } else {
        opacity_toggle_onoff = "all";
      }
    });

    // If Search box "Go" button pressed

    $("#gosearch").click(function() {
      if ((searchshapes.value !== "") && (!/^\d+$/.test(searchshapes.value))){  //Only do the following if string is not blank & contains some text (i.e. not strictly numeric)
        viewer.model.children.forEach(function(child, i) {
	  var anchor = "shape-" + i;
  	  var anchor_top = "top-" + i;
	  if (child.name == searchshapes.value) {
	    selected_object = "search";
       	    window.location.hash = "#" + anchor;
	    document.getElementById(anchor).style.backgroundColor = "#1E8FFF";
	    document.getElementById(anchor_top).style.visibility = 'visible';
            viewer.setTransparency(1, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
	  } else {   //focus selected object, no need for shift-click
	    document.getElementById(anchor).style.backgroundColor = 'black';
	    document.getElementById(anchor_top).style.visibility = 'hidden';
	    slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
            viewer.setTransparency(0, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
	  }
        });
      } else if ((searchshapes.value !== "") && (/^\d+$/.test(searchshapes.value)))  {  // If strictly numeric, search by vertex number
        searchindex = searchshapes.value;	  
        pick(viewer.x, viewer.y, slider_backup, searchindex);	//viewer.x and viewer.y are irrelevant and overwritten

	viewer.model.children.forEach(function(child, i) {
          var anchor = "shape-" + i;
          var anchor_top = "top-" + i;
          if (child.name == picked_object.name) {
            selected_object = "search";
            window.location.hash = "#" + anchor;
            document.getElementById(anchor).style.backgroundColor = "#1E8FFF";
            document.getElementById(anchor_top).style.visibility = 'visible';
            viewer.setTransparency(1, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
          } else {   //focus selected object, no need for shift-click
            document.getElementById(anchor).style.backgroundColor = 'black';
            document.getElementById(anchor_top).style.visibility = 'hidden';
            slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
            viewer.setTransparency(0, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
	  }
        });
      searchshapes.value = picked_object.name;
      }
    focus_toggle = "on";
    });

    // If Search box "Clear" button pressed
    $("#clearsearch").click(function() {
      document.getElementById("searchshapes").value="";
      viewer.model.children.forEach(function(child, i) {
        var anchor = "shape-" + i;
        var anchor_top = "top-" + i;
	window.location.hash = "#shape-0";
        window.location.hash = "#surface-choice";
        document.getElementById(anchor).style.backgroundColor = 'black';
        document.getElementById(anchor_top).style.visibility = 'hidden';
        //slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
        viewer.setTransparency(1, {shape_name: child.name});
        $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
      });
    focus_toggle = "off";
    searchshapes.value="";
    searchindex = "";
    });

    // Set the visibility of the currently loaded model.
    $(".visibility").change(function() {
      var input  = $(this);
      var hemisphere = input.data("hemisphere");
      var shape = viewer.model.getObjectByName(hemisphere);

      if (!shape) return;

      // If the shapes wireframe is currently being displayed,
      // set the wireframe's visibility.
      if (shape.wireframe_active) {
        shape = shape.getObjectByName("__wireframe__") || shape;
      }

      shape.visible = input.is(":checked");

      viewer.updated = true;
    });
    
    // Set the view type (medial, lateral,
    // inferior, anterior, posterior).
    $("[name=hem-view]").change(function() {
      viewer.setView($("[name=hem-view]:checked").val());
    });
    
    // Toggle wireframe.
    $("#wireframe").change(function() {
      viewer.setWireframe($(this).is(":checked"));
    });
    
    // Toggle 3D anaglyph effect.
    $("#threedee").change(function() {
      viewer.setEffect($(this).is(":checked") ? "AnaglyphEffect" : "None");
    });
    
    // Grab a screenshot of the canvas.
    $("#screenshot").click(function() {
      var view_window = viewer.dom_element;
      var canvas = document.createElement("canvas");
      var spectrum_canvas = document.getElementById("spectrum-canvas");
      var context = canvas.getContext("2d");
      var viewer_image = new Image();
      var fileName;
      
      canvas.width = view_window.offsetWidth;
      canvas.height = view_window.offsetHeight;
    
      // Display the final image in a dialog box.
      function displayImage() {
        var result_image = new Image();
        
        result_image.onload = function() {
          $("<div></div>").append(result_image).dialog({
            title: "Screenshot",
            height: result_image.height,
            width: result_image.width
          });
        };
        result_image.src = canvas.toDataURL();
      }
   
      // Grab the spectrum canvas to display with the
      // image.
      function getSpectrumImage() {
        var spectrum_image = new Image();
        spectrum_image.onload = function(){
          context.drawImage(spectrum_image, 0, 0);
          displayImage();
        };
        spectrum_image.src = spectrum_canvas.toDataURL();
      }
      
      // Draw an image of the viewer area, add the spectrum
      // image if it's available, and display everything
      // in a dialog box.
      viewer_image.onload = function(){
        context.drawImage(viewer_image, 0, 0);
        if ($(spectrum_canvas).is(":visible")) {
          getSpectrumImage();
        } else {
          displayImage();
        }
      };
      
      viewer_image.src = viewer.canvasDataURL();

      var url = viewer_image.src.replace(/^data:image\/[^;]/, 'data:application/octet-stream');

      saveAs(url, 'Screenshot.png');

      function saveAs(uri, filename) {
        var link = document.createElement('a');
        if (typeof link.download === 'string') {
          document.body.appendChild(link); //Firefox requires the link to be in the body
          link.download = filename;
          link.href = uri;
          link.click();
          document.body.removeChild(link); //remove the link when done
        } else {
          location.replace(uri);
        }
      }

    });
    
    // Control autorotation.
    $("#autorotate-controls").children().change(function() {
      viewer.autorotate.x = $("#autorotateX").is(":checked");
      viewer.autorotate.y = $("#autorotateY").is(":checked");
      viewer.autorotate.z = $("#autorotateZ").is(":checked");
    });

    // Remove currently loaded models.
    $("#clearshapes").click(function() {
      viewer.clearScreen();
      current_request = 0;
      current_request_name = "";
      loading_div.hide();
    });

    $("#brainbrowser").click(function(event) {
      if (!event.shiftKey) return;
      viewer.model.children.forEach(function(child) {
      slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
	});
      pick(viewer.mouse.x, viewer.mouse.y, event.ctrlKey);
      selected_object = "click";
      viewer.model.children.forEach(function(child, i) {
        var anchor = "shape-" + i;
        var anchor_top = "top-" + i;
        if (child.name == picked_object.name) {
          window.location.hash = "#" + anchor;
          document.getElementById(anchor).style.backgroundColor = '#1E8FFF';
          document.getElementById(anchor_top).style.visibility = 'visible';
        } else {   //focus selected object, no need for shift-click
          document.getElementById(anchor).style.backgroundColor = 'black';
          document.getElementById(anchor_top).style.visibility = 'hidden';
        }
      });
      focus_toggle = "off";
    });

    $("#focus-shape").click(function(event) {

      var name;

	if (selected_object === "click"){ 
      	  name = $("#pick-name").html();
	} else if (selected_object === "search"){
      	  name = searchshapes.value;
	} else {
	  return;
	}

	if (focus_toggle == "off"){
      	  viewer.model.children.forEach(function(child) {
	    if (child.name !== name) {
              slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
	      viewer.setTransparency(0, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
            }
      	  });
	focus_toggle = "on";
	} else if (focus_toggle == "on"){
          viewer.model.children.forEach(function(child) {
            if (child.name !== name) {

            var alpha = slider_backup[child.name] / 100;

            viewer.setTransparency(alpha, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", slider_backup[child.name]);
            }
          });
        focus_toggle = "off";
	}
    });

    document.getElementById("brainbrowser").addEventListener("touchend", function(event) {
      var touch = event.changedTouches[0];
      var offset = BrainBrowser.utils.getOffset(this);
      var x, y;

      if (touch.pageX !== undefined) {
        x = touch.pageX;
        y = touch.pageY;
      } else {
        x = touch.clientX + window.pageXOffset;
        y = touch.clientY + window.pageYOffset;
      }
      
      x = x - offset.left;
      y = y - offset.top;

      pick(x, y, true);
    }, false);

    $("#pick-value").change(function() {
      var index = parseInt($("#pick-index").html(), 10);
      var value = parseFloat(this.value);
      if (BrainBrowser.utils.isNumeric(index) && BrainBrowser.utils.isNumeric(value)) {
        viewer.setIntensity(index, value);
      }
    });

    $("#paint-value").change(function() {
      var value = parseFloat(this.value);
      var model_data = viewer.model_data.get();

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          format: "hex",
          min: model_data.intensity_data.range_min,
          max: model_data.intensity_data.range_max
        }));
      }
    });

    // If the user changes the format that's being submitted,
    // display a hint if one has been configured.
    $(".file-format").change(function() {
      var div = $(this).closest(".file-select");
      var format = div.find("option:selected").val();
      div.find(".format-hint").html(BrainBrowser.config.surface_viewer.model_types[format].format_hint || "");
    });

    // Load a new model from a file that the user has
    // selected.
    $("#obj-file-submit").click(function() {
      var format = $(this).closest(".file-select").find("option:selected").val();

      showLoading();
      viewer.loadModelFromFile(document.getElementById("objfile"), {
        format: format,
        complete: hideLoading
      });

      return false;
    });

    $("#data1-submit").click(function() {
      var format = $(this).closest(".file-select").find("option:selected").val();
      var file = document.getElementById("datafile1");

      viewer.loadIntensityDataFromFile(file, {
        format: format,
        blend_index : 0
      });
    });

    $("#data2-submit").click(function() {
      var format = $(this).closest(".file-select").find("option:selected").val();
      var file = document.getElementById("datafile2");

      viewer.loadIntensityDataFromFile(file, {
        format: format,
        blend_index : 1
      });
    });

    // Load a color map select by the user.
    $("#color-map").change(function() {
      viewer.loadColorMapFromFile(this);
    });

    // Load first model.
    $("a.example[data-example-name=realct]").click();

    function pick(x, y, paint) {
      if (viewer.model.children.length === 0) return;

      var annotation_display = $("#annotation-display");
      var media = $("#annotation-media");
      var pick_info = viewer.pick(x, y, slider_backup, searchindex);
      var model_data;
      var annotation_info;
      var value, label, text;

      if (pick_info) {
        $("#pick-name").html(pick_info.object.name);
        $("#pick-shape-number").html(shapeNumber(pick_info.object.name));
        $("#pick-x").html(pick_info.point.x.toPrecision(4));
        $("#pick-y").html(pick_info.point.y.toPrecision(4));
        $("#pick-z").html(pick_info.point.z.toPrecision(4));
        $("#pick-index").html(pick_info.index);
        $("#annotation-wrapper").show();
        picked_object = pick_info.object;
        model_data = viewer.model_data.get(picked_object.model_name);
        if (model_data.intensity_data) {
          if (paint) {
            value = parseFloat($("#paint-value").val());
            if (BrainBrowser.utils.isNumeric(value)) {
              viewer.setIntensity(pick_info.index, value);
            }
          }

          value = model_data.intensity_data.values[pick_info.index];
          $("#pick-value").val(value.toString().slice(0, 7));
          $("#pick-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
            format: "hex",
            min: model_data.intensity_data.range_min,
            max: model_data.intensity_data.range_max
          }));
          label = atlas_labels[value];
          if (label) {
            text = label + '<BR><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/?term=' +
              label.split(/\s+/).join("+") +
              '">Search on PubMed</a>';
            text += '<BR><a target="_blank" href="http://scholar.google.com/scholar?q=' +
              label.split(/\s+/).join("+") +
              '">Search on Google Scholar</a>';
          } else {
            text = "None";
          }
          $("#pick-label").html(text);
        }

        annotation_info = picked_object.annotation_info;

        if (annotation_info) {
          viewer.annotations.activate(annotation_info.vertex, {
            model_name: annotation_info.model_name
          });
        } else {
          annotation_info = { data : {} };
        }

        $("#annotation-image").val(annotation_info.data.image);
        $("#annotation-url").val(annotation_info.data.url);
        $("#annotation-text").val(annotation_info.data.text);

        annotation_display.hide();
        media.html("");

        if (annotation_info.data.image) {
          var image = new Image();
          image.height = 200;
          image.src = annotation_info.data.image;
          annotation_display.show();
          media.append(image);
        }
        if (annotation_info.data.url) {
          annotation_display.show();
          media.append($('<div><a href="' + annotation_info.data.url + '" target="_blank">' + annotation_info.data.url + '</a></div>'));
        }

        if (annotation_info.data.text) {
          annotation_display.show();
          media.append($('<div>' + annotation_info.data.text + '</div>'));
        }

      } else {
        picked_object = null;

        $("#pick-name").html("");
        $("#pick-shape-number").html("");
        $("#pick-x").html("");
        $("#pick-y").html("");
        $("#pick-z").html("");
        $("#pick-index").html("");
      }

      viewer.updated = true;
    }

    function shapeNumber(name) {
      var children = viewer.model.children;
      var i, count;

      for (i = 0, count = children.length; i < count; i++) {
        if (children[i].name === name) {
          return i + 1;
        }
      }
    }
  });
});
