/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011 
* The Royal Institution for the Advancement of Learning
* McGill University
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

  var THREE = BrainBrowser.SurfaceViewer.THREE;

  // Request variables used to cancel the current request
  // if another request is started.
  var current_request = 0;
  var current_request_name = "";

  // Hide or display loading icon.
  var loading_div = $("#loading");
  function showLoading() { loading_div.show(); }
  function hideLoading() { loading_div.hide(); }
  
  // Make sure WebGL is available.
  if (!BrainBrowser.WEBGL_ENABLED) {
    $("#brainbrowser").html(BrainBrowser.utils.webGLErrorMessage());
    return;
  }

  /////////////////////////////////////
  // Start running the Surface Viewer
  /////////////////////////////////////
  window.viewer = BrainBrowser.SurfaceViewer.start("brainbrowser", function(viewer) {

    var picked_object = null;
    var picked_coords;
    var atlas_labels = {};
    var autoshapes  = [];
    var select_mode = "none";
    var focus_toggle = "off";
    var opacity_toggle_custom = "off";
    var opacity_toggle_onoff = "on";
    var axes_toggle = "off";
    var slider_backup = {};
    var searchindex= "" ;
    var marker = "";
    var axes_length = 100;
    var current_count;
    var legend_div = "";
    var bgcolor = "black";

    // Add the three.js 3D anaglyph effect to the viewer.
    viewer.addEffect("AnaglyphEffect");

    ///////////////////////////////////
    // Event Listeners
    ///////////////////////////////////

    // If something goes wrong while loading, we don't
    // want the loading icon to stay on the screen.
    BrainBrowser.events.addEventListener("error", hideLoading);

    // When a new model is added to the viewer, create a transparency slider
    // for each shape that makes up the model.
    viewer.addEventListener("displaymodel", function(event) {

      var slider, slider_div, slider_div_end;
      var children = event.model_data.shapes;
      current_count = $("#shapes").children().length;
      if(children.length - current_count > 0 ) {
        children.slice(current_count).forEach(function(shape, i) {
          slider_div = $("<div id=\"shape-" + i + "\" class=\"shape\">" +
            "<h4> <p class=\"alignleft\"> Shape " + (i + 1 + current_count) + "</p></h4>" + 
	    "<div id=\"top-" + i + "\" style=\"visibility: hidden\"><a href=\"#surface_choice\"><p class=\"alignright\">back to top</a></p></div><br />" +
            "<div style=\"clear: both;\">" +
            "Name: " + shape.name + "<br />" +
            "<p class=\"alignleft\"> Opacity: </p></div>");
          slider = $("<div id=\"opacity-slider" +  i +"\" class=\"opacity-slider aligncenter slider\" data-shape-name=\"" + shape.name + "\">");
	  slider_div_end = $("<p class=\"alignright\"><a class=\"button\" id=\"individualtoggleopacity" +  i + "\">On</a></p>");
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
              if ((marker !== "") && (shape_name == picked_object.name)){
                viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
	      }
            }
          });

          slider_div_end.appendTo(slider_div);
          slider.appendTo(slider_div);
          slider_div.appendTo("#shapes");
	  autoshapes[i]={};
	  autoshapes[i].label = shape.name;
          $("#individualtoggleopacity" + i).click(function() {
	    if ($(this).html() == "On"){
	      slider_backup[shape.name] = $(".opacity-slider[data-shape-name='" + shape.name + "']").slider("value");
              viewer.setTransparency(0, {shape_name: shape.name});
              $(".opacity-slider[data-shape-name='" + shape.name + "']").slider("value", 0);
              $(this).html("Off");
	      document.getElementById("opacity-slider" + i).style.visibility = "hidden";
              clearShape("marker");
	    } else {
              var alpha = slider_backup[shape.name] / 100;
              viewer.setTransparency(alpha, {shape_name: shape.name});
              $(".opacity-slider[data-shape-name='" + shape.name + "']").slider("value", slider_backup[shape.name]);
              $(this).html("On");
              document.getElementById("opacity-slider" + i).style.visibility = "visible";
              if (marker !== ""){
	        marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
	        marker.name = "marker";
	        viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
              }
	    }
          });
        });
      }
      $("#searchshapes").autocomplete({
        source: autoshapes
      }).autocomplete("widget").addClass("fixed-height");
      current_count = $("#shapes").children().length;
    });

    // When the screen is cleared, remove all UI related
    // to the displayed models.
    viewer.addEventListener("clearscreen", function() {
      $("#shapes").html("");
      $("#data-range-box").hide();
      $("#color-map-box").hide();
      $("#vertex-data-wrapper").hide();
      $("#pick-value-wrapper").hide();
      $("#pick-label-wrapper").hide();
      $("#pick-x").html("");
      $("#pick-y").html("");
      $("#pick-z").html("");
      $("#pick-index").html("");
      $("#pick-value").val("");
      $("#pick-color").css("background-color", "transparent");
      $("#pick-label").html("");
      $("#intensity-data-export").hide();
      $("#annotation-media").html("");
      $("#annotation-display").hide();
      $("#annotation-wrapper").hide();
      viewer.annotations.reset();
      picked_object = null;
      marker = "";
      select_mode = "none";
      focus_toggle = "off";
      opacity_toggle_custom = "off";
      opacity_toggle_onoff = "on";
      axes_toggle="off";
      searchindex= "";
      clearShape("marker");
      clearShape("axes");
    });

    // When the intensity range changes, adjust the displayed spectrum.
    viewer.addEventListener("changeintensityrange", function(event) {
      var intensity_data = event.intensity_data;
      var canvas = viewer.color_map.createElement(intensity_data.range_min, intensity_data.range_max);
      canvas.id = "spectrum-canvas";
      $("#color-bar").html(canvas);
    });

    // When new intensity data is loaded, create all UI related to
    // controlling the relationship between the intensity data and
    // the color mapping (range, flip colors, clamp colors, fix range).

    viewer.addEventListener("loadintensitydata", function(event) {
      var model_data = event.model_data;
      var intensity_data = event.intensity_data;
      var container = $("#data-range");
      var headers = '<div id="data-range-multiple"><ul>';
      var controls = "";
      var i, count;
      var data_set = model_data.intensity_data;

      container.html("");
      for(i = 0, count = data_set.length; i < count; i++) {
        headers += '<li><a href="#data-file' + i + '">' + data_set[i].name + '</a></li>';
        controls += '<div id="data-file' + i + '" class="box range-controls">';
        controls += 'Min: <input class="range-box" id="data-range-min" type="text" name="range_min" size="5" >';
        controls += '<div id="range-slider' + i + '" data-blend-index="' + i + '" class="slider"></div>';
        controls += 'Max: <input class="range-box" id="data-range-max" type="text" name="range_max" size="5">';
        controls += '<input type="checkbox" class="button" id="fix_range"' +
                    (viewer.getAttribute("fix_color_range") ? ' checked="true"' : '') +
                    '><label for="fix_range">Fix Range</label>';
        controls += '<input type="checkbox" class="button" id="clamp_range"' +
                    (viewer.color_map && viewer.color_map.clamp ? ' checked="true"' : '') +
                    '><label for="clamp_range">Clamp range</label>';
        controls += '<input type="checkbox" class="button" id="flip_range"' +
                    (viewer.color_map && viewer.color_map.flip ? ' checked="true"' : '') +
                    '><label for="flip_range">Flip Colors</label>';
        controls += '</div>';
      }
      headers += "</ul>";

      container.html(headers + controls + "</div>");
      $("#data-range-box").show();
      $("#color-map-box").show();
      container.find("#data-range-multiple").tabs();

      container.find(".range-controls").each(function(index) {
        var controls = $(this);
        var intensity_data = data_set[index];

        var data_min = intensity_data.min;
        var data_max = intensity_data.max;
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

	    viewer.setIntensityRange(intensity_data, min, max);
          }
        });

        slider.slider("values", 0, parseFloat(range_min));
        slider.slider("values", 1, parseFloat(range_max));
        min_input.val(range_min);
        max_input.val(range_max);

        function inputRangeChange() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());
          
          slider.slider("values", 0, min);
          slider.slider("values", 1, max);
          viewer.setIntensityRange(intensity_data, min, max);
        }

        $("#data-range-min").change(inputRangeChange);
        $("#data-range-max").change(inputRangeChange);

        $("#fix_range").click(function() {
          viewer.setAttribute("fix_color_range", $(this).is(":checked"));
        });

        $("#clamp_range").change(function() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());

          if (viewer.color_map) {
            viewer.color_map.clamp = $(this).is(":checked");
          }

          viewer.setIntensityRange(intensity_data, min, max);
        });


        $("#flip_range").change(function() {
          var min = parseFloat(min_input.val());
          var max = parseFloat(max_input.val());

          if (viewer.color_map) {
            viewer.color_map.flip = $(this).is(":checked");
          }

          viewer.setIntensityRange(intensity_data, min, max);
        });
      });


      $("#paint-value").val(intensity_data.values[0]);
      $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(intensity_data.values[0], {
        hex: true,
        min: intensity_data.range_min,
        max: intensity_data.range_max
      }));

      blendUI(data_set.length > 1);

    }); // end loadintensitydata listener

    viewer.addEventListener("updatecolors", function(event) {
      var model_data = event.model_data;
      var intensity_data = model_data.intensity_data[0];
      var value = parseFloat($("#pick-value").val());
      var spectrum_div = document.getElementById("color-bar");
      var min, max;
      var canvas;

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#pick-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          hex: true,
          min: intensity_data.range_min,
          max: intensity_data.range_max
        }));
      }

      value = parseFloat($("#paint-value").val());

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          hex: true,
          min: intensity_data.range_min,
          max: intensity_data.range_max
        }));
      }

      if (model_data && intensity_data) {
        min = intensity_data.range_min;
        max = intensity_data.range_max;
      } else {
        min = 0;
        max = 100;
      }

      canvas = viewer.color_map.createElement(min, max);
      canvas.id = "spectrum-canvas";
      if (!spectrum_div) {
        $("<div id=\"color-bar\"></div>").html(canvas).appendTo("#data-range-box");
      } else {
        $(spectrum_div).html(canvas);
      }

    });

    viewer.addEventListener("updateintensitydata", function(event) {
      var intensity_data = event.intensity_data;
      var link = $("#intensity-data-export-link");
      var values = Array.prototype.slice.call(intensity_data.values);

      link.attr("href", BrainBrowser.utils.createDataURL(values.join("\n")));
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
    $("#clear_color").change(function(e){

      bgcolor = parseInt($(e.target).val(), 16);
      viewer.setClearColor(bgcolor);
      if (window.axesbox !== undefined){ 
       axesbox.setClearColor(bgcolor);
      }
    });
    
    // Reset to the default view.
    $("#resetview").click(function() {

      clearShape("marker");
      clearShape("axes");
      axes_toggle = "off";

      // Setting the view to its current view type will
      // automatically reset its position and opacity is reset to 100% for all shapes.
      viewer.setView($("[name=hem_view]:checked").val());

      viewer.model.children.forEach(function(child,i) {
        if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
          viewer.setTransparency(1, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
          $("#individualtoggleopacity" + i).html("On");
          document.getElementById("opacity-slider" + i).style.visibility = "visible";
          document.getElementById("shape-" + i).style.backgroundColor = "black";
          document.getElementById("top-" + i).style.visibility = "hidden";
        }
      });
      window.location.hash = "#shape-0";
      window.location.hash = "#surface-choice";
    });

    // Toggle opacity (custom vs. on).
    $("#toggleopacitycustom").click(function() {

      if (  opacity_toggle_custom == "on") {
        viewer.model.children.forEach(function(child,i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
            var alpha = slider_backup[child.name] / 100;
            viewer.setTransparency(alpha, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", slider_backup[child.name]);
            $("#individualtoggleopacity" + i).html("On");
            document.getElementById("opacity-slider" + i).style.visibility = "visible";
          }
	}); 
        if (marker !== ""){
          marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
          marker.name = "marker";
          viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
        }
	opacity_toggle_custom = "off";
        } else {
          clearShape("marker");
          viewer.model.children.forEach(function(child,i) {
            if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){ 
              slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
              viewer.setTransparency(0, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
              $("#individualtoggleopacity" + i).html("Off");
              document.getElementById("opacity-slider" + i).style.visibility = "hidden";
            }
          });
	opacity_toggle_custom = "on";
        if ((viewer.model.children.length < current_count+1) && (axes_toggle === "on")){
          var axes = buildAxes( axes_length );
        }
      }
    });

    // Toggle opacity (on vs. off).
    $("#toggleopacityonoff").click(function() {

      if (  opacity_toggle_onoff == "off"){
        viewer.model.children.forEach(function(child,i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){

            viewer.setTransparency(1, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
            $("#individualtoggleopacity" + i).html("On");
            document.getElementById("opacity-slider" + i).style.visibility = "visible";
          }
        });
        if (marker !== ""){
          marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
          marker.name = "marker";
          viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
        }
        opacity_toggle_onoff = "on";
      } else {
        clearShape("marker");
        viewer.model.children.forEach(function(child,i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
            viewer.setTransparency(0, {shape_name: child.name});
            $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
            $("#individualtoggleopacity" + i).html("Off");
            document.getElementById("opacity-slider" + i).style.visibility = "hidden";
          }
	});
	opacity_toggle_onoff = "off";
        if ((viewer.model.children.length < current_count+1) && (axes_toggle === "on")){
          var axes = buildAxes( axes_length );
	}
      }
    });

    // If Search box "Go" button pressed

    $("#gosearch").click(function() {

      clearShape("marker");

      if ((searchshapes.value !== "") && (!/^\d+$/.test(searchshapes.value))){  //Only do the following if string is not blank & contains some text (i.e. not strictly numeric)

        $("#pick-name").html("");
        $("#pick-shape-number").html("");
        $("#pick-x").html("");
        $("#pick-y").html("");
        $("#pick-z").html("");
        $("#pick-index").html("");

        viewer.model.children.forEach(function(child, i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
     	    if (child.name == searchshapes.value) {
              searchindex = child.name;
              $("#pick-shape-number").html(i+1);
  	      $("#pick-name").html(child.name);
       	      window.location.hash = "#" + "shape-" + i;
	      document.getElementById("shape-" + i).style.backgroundColor = "#1E8FFF";
	      document.getElementById("top-" + i).style.visibility = "visible";
              viewer.setTransparency(1, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
              $("#individualtoggleopacity" + i).html("On");
  	    } else {   //focus selected object, no need for shift-click
	      document.getElementById("shape-" + i).style.backgroundColor = "black";
	      document.getElementById("top-" + i).style.visibility = "hidden";
	      slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
              viewer.setTransparency(0, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
              $("#individualtoggleopacity" + i).html("Off");
            }
	  }
        });
	marker = "";
      } else if ((searchshapes.value !== "") && (/^\d+$/.test(searchshapes.value)))  {  // If strictly numeric, search by vertex number

        searchindex = searchshapes.value;	  
        pick(viewer.x, viewer.y, slider_backup, searchindex);	//viewer.x and viewer.y are irrelevant and overwritten

	viewer.model.children.forEach(function(child, i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
            if (child.name == picked_object.name) {
              window.location.hash = "#" + "shape-" + i;
              document.getElementById("shape-" + i).style.backgroundColor = "#1E8FFF";
              document.getElementById("top-" + i).style.visibility = "visible";
              viewer.setTransparency(1, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
              $("#individualtoggleopacity" + i).html("On");
            } else {   //focus selected object, no need for shift-click
              document.getElementById("shape-" + i).style.backgroundColor = "black";
              document.getElementById("top-" + i).style.visibility = "hidden";
              slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
              viewer.setTransparency(0, {shape_name: child.name});
              $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
              $("#individualtoggleopacity" + i).html("Off");
  	    }
          }
        });
        searchindex = picked_object.name;
        if ((viewer.model.children.length < current_count+1) && (axes_toggle === "on")){
          var axes = buildAxes( axes_length );
        }
        marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
        marker.name = "marker";
        viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
      }
      focus_toggle = "on";
      select_mode = "search";
    });

    // If Search box "Clear" button pressed
    $("#clearsearch").click(function() {
      clearShape("marker");
      document.getElementById("searchshapes").value="";
      viewer.model.children.forEach(function(child, i) {
        if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
	  window.location.hash = "#shape-0";
          window.location.hash = "#surface-choice";
          document.getElementById("shape-" + i).style.backgroundColor = "black";
          document.getElementById("top-" + i).style.visibility = "hidden";
          viewer.setTransparency(1, {shape_name: child.name});
          $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 100);
        }
      });
    focus_toggle = "off";
    searchshapes.value="";
    searchindex = "";
    $("#pick-name").html("");
    $("#pick-shape-number").html("");
    $("#pick-x").html("");
    $("#pick-y").html("");
    $("#pick-z").html("");
    $("#pick-index").html("");
    });

    // Set the visibility of the currently loaded model.
    $(".visibility").change(function() {
      var input  = $(this);
      var hemisphere = input.data("hemisphere");
      var shape = viewer.model.getObjectByName(hemisphere);

      if (!shape) return;

      shape.visible = input.is(":checked");

      viewer.updated = true;
    });
    
    // Set the view type (medial, lateral,
    // inferior, anterior, posterior).
    $("[name=hem_view]").change(function() {
      viewer.setView($("[name=hem_view]:checked").val());
    });
    
    // Toggle wireframe.
    $("#meshmode").change(function() {
      viewer.setWireframe($(this).is(":checked"));
    });
    
    // Toggle 3D anaglyph effect.
    $("#threedee").change(function() {
      viewer.setEffect($(this).is(":checked") ? "AnaglyphEffect" : "None");
    });
    
    // Grab a screenshot of the canvas.
    $("#screenshot").click(function() {
      var dom_element = viewer.dom_element;
      var canvas = document.createElement("canvas");
      var spectrum_canvas = document.getElementById("spectrum-canvas");
      var context = canvas.getContext("2d");
      var viewer_image = new Image();
      
      canvas.width = dom_element.offsetWidth;
      canvas.height = dom_element.offsetHeight;
    
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

      var url = viewer_image.src.replace(/^data:image\/[^;]/, "data:application/octet-stream");

      saveAs(url, "Screenshot.png");

      function saveAs(uri, filename) {
        var link = document.createElement("a");
        if (typeof link.download === "string") {
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

    // Toggle axes.
    $("#toggle-axes").click(function() {
      if (axes_toggle === "off"){
        var axes = buildAxes( axes_length );
        axes_toggle = "on";
      } else{
        clearShape("axes");
	axes_toggle = "off";
        if (marker !== ""){
          marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
          marker.name = "marker";
          viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
        }
        axesbox.model.name = "axes_off";
      }
    });

    // Color map URLs are read from the config file and added to the
    // color map select box.
    var color_map_select = $('<select id="color-map-select"></select>').change(function() {
      viewer.loadColorMapFromURL($(this).val());
    });

    BrainBrowser.config.get("color_maps").forEach(function(color_map) {
      color_map_select.append('<option value="' + color_map.url + '">' + color_map.name +'</option>');
    });

    $("#color-map-box").append(color_map_select);

    // Remove currently loaded models.
    $("#clearshapes").click(function() {
      viewer.clearScreen();
      current_request = 0;
      current_request_name = "";
      loading_div.hide();
    });

    $("#brainbrowser").click(function(event) {
      if (!event.shiftKey && !event.ctrlKey) return;
      if (viewer.model.children.length === 0) return;
      searchshapes.value = "";
      searchindex = "";

      clearShape("marker");

      viewer.model.children.forEach(function(child, i) {
        if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
          slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
        }
      });

      pick(viewer.mouse.x, viewer.mouse.y, event.ctrlKey);
      if (picked_object === null) {
        marker="";
        clearShape("marker");
//        if (axes_toggle === "on"){
//          var axes = buildAxes( axes_length );
 //       }
        return;
      } else {
        viewer.model.children.forEach(function(child, i) {
          if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
            if (child.name == picked_object.name) {
              window.location.hash = "#" + "shape-" + i;
              document.getElementById("shape-" + i).style.backgroundColor = "#1E8FFF";
              document.getElementById("top-" + i).style.visibility = "visible";
            } else {   //focus selected object, no need for shift-click
              document.getElementById("shape-" + i).style.backgroundColor = "black";
              document.getElementById("top-" + i).style.visibility = "hidden";
            }
          }
        });
      }
      marker = viewer.drawDot(picked_coords.x, picked_coords.y, picked_coords.z, 0.3);
      marker.name = "marker";
      viewer.setTransparency(picked_object.material.opacity, {shape_name: "marker"});
      select_mode = "click";
      focus_toggle = "off";
    });

    $("#focus-shape").click(function(event) {
      var name;

	if (select_mode === "click"){ 
      	  name = $("#pick-name").html();
	} else if (select_mode === "search"){
      	  name = searchindex;
	} else {
	  return;
	}

	if (focus_toggle == "off"){
      	  viewer.model.children.forEach(function(child,i) {
            if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
	      if ((child.name !== name) && (i < ($("#shapes").children().length))) {
                slider_backup[child.name] = $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value");
    	        viewer.setTransparency(0, {shape_name: child.name});
                $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", 0);
	        $("#individualtoggleopacity" + i).html("Off");
              }
            }
      	  });
	focus_toggle = "on";
	} else if (focus_toggle == "on"){
          viewer.model.children.forEach(function(child,i) {
            if ((viewer.model.children[i].name !== "axes") && (viewer.model.children[i].name !== "marker")){
              if (child.name !== name){

                var alpha = slider_backup[child.name] / 100;
                viewer.setTransparency(alpha, {shape_name: child.name});
                $(".opacity-slider[data-shape-name='" + child.name + "']").slider("value", slider_backup[child.name]);
                $("#individualtoggleopacity" + i).html("On");
              }
            }
          });
        focus_toggle = "off";
	}
    });

    // Load a new model from a file that the user has
    // selected.
    $("#obj_file_submit").click(function() {

      if (document.getElementById("objfile").value == ""){
        window.alert("Please select a file!");
        return;
      }

      var format = $(this).closest(".file-select").find("option:selected").val();

      showLoading();
      viewer.loadModelFromFile(document.getElementById("objfile"), {
        format: format,
        complete: hideLoading
      });
      return false;
    });

    $("#pick-value").change(function() {
      var index = parseInt($("#pick-index").html(), 10);
      var value = parseFloat(this.value);
      var intensity_data = viewer.model_data.getDefaultIntensityData();

      if (BrainBrowser.utils.isNumeric(index) && BrainBrowser.utils.isNumeric(value)) {
        viewer.setIntensity(intensity_data, index, value);
      }
    });

    $("#paint-value").change(function() {
      var value = parseFloat(this.value);
      var intensity_data = viewer.model_data.getDefaultIntensityData();

      if (BrainBrowser.utils.isNumeric(value)) {
        $("#paint-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
          hex: true,
          min: intensity_data.range_min,
          max: intensity_data.range_max
        }));
      }
    });

    $("#annotation-save").click(function() {
      var vertex_num = parseInt($("#pick-index").html(), 10);
      var annotation_display = $("#annotation-display");
      var media = $("#annotation-media");

      var annotation, annotation_data;
      var vertex;

      if (BrainBrowser.utils.isNumeric(vertex_num)) {
        annotation = viewer.annotations.get(vertex_num, {
          model_name: picked_object.model_name
        });

        if (annotation) {
          annotation_data = annotation.annotation_info.data;
        } else {
          annotation_data = {};
          viewer.annotations.add(vertex_num, annotation_data, {
            model_name: picked_object.model_name
          });
        }

        vertex = viewer.getVertex(vertex_num);

        annotation_data.image = $("#annotation-image").val();
        annotation_data.url = $("#annotation-url").val();
        annotation_data.text = $("#annotation-text").val();

        media.html("");

        if (annotation_data.image) {
          var image = new Image();
          image.width = 200;
          image.src = annotation_data.image;
          annotation_display.show();
          media.append(image);
        }
        if (annotation_data.url) {
          annotation_display.show();
          media.append($('<div><a href="' + annotation_data.url + '" target="_blank">' + annotation_data.url + '</a></div>'));
        }

        if (annotation_data.text) {
          annotation_display.show();
          media.append($('<div>' + annotation_data.text + '</div>'));
        }
      }
    });

    function pick(x, y, paint) {
      if (viewer.model.children.length === 0) return;

      var annotation_display = $("#annotation-display");
      var media = $("#annotation-media");
      var pick_info = viewer.pick(x, y, slider_backup, searchindex);
      var model_data, intensity_data;
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
        picked_coords = pick_info.point; 
        model_data = viewer.model_data.get(picked_object.userData.model_name);
        intensity_data = model_data.intensity_data[0];

        if (intensity_data) {
          if (event.ctrlKey) {
            value = parseFloat($("#paint-value").val());

            if (BrainBrowser.utils.isNumeric(value)) {
              viewer.setIntensity(intensity_data, pick_info.index, value);
            }
          }

          value = intensity_data.values[pick_info.index];
          $("#pick-value").val(value.toString().slice(0, 7));
          $("#pick-color").css("background-color", "#" + viewer.color_map.colorFromValue(value, {
            hex: true,
            min: intensity_data.range_min,
            max: intensity_data.range_max
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

        annotation_info = pick_info.object.userData.annotation_info;

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
        $("#annotation-wrapper").hide();
      }
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

    function clearShape(name) {     
      if (name === "axes"){
        axesbox.model.children.forEach(function(child,i) {

          if (child.name === name) {
            axesbox.model.children.splice(i);
            axesbox.updated = true;
          }
        });
        document.getElementById("axes_legend").style.visibility = "hidden";
        document.getElementById("axes").style.visibility = "hidden";
      } else {
        viewer.model.children.forEach(function(child,i) {

          if (child.name === name) {
            viewer.model.children.splice(i);
            viewer.updated = true;
          }
        });
      }
    }

    function buildAxes( length ) {

      var axes_all = new THREE.Object3D();
      var origin_y = 0;
//      var origin_y = -200;

      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( length, origin_y, 0 ), 0xFF0000, false ) ); // +X  		red solid = medial
      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( -length, origin_y, 0 ), 0xFF0000, true) ); // -X 		red dashed = lateral
      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( 0, length + origin_y, 0 ), 0x00FF00, false ) ); // +Y    	green solid = anterior
      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( 0, -length + origin_y, 0 ), 0x00FF00, true ) ); // -Y    	green dashed = posterior
      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( 0, origin_y, length ), 0x0000FF, false ) ); // +Z    	blue solid = dorsal
      axes_all.add( buildAxis( new THREE.Vector3( 0, origin_y, 0 ), new THREE.Vector3( 0, origin_y, -length ), 0x0000FF, true ) ); // -Z    	blue dashed = ventral

      axes_all.name = "axes";
//      viewer.model.add(axes_all);
//      viewer.updated = true;

      if (window.axesbox === undefined){
        window.axesbox = BrainBrowser.SurfaceViewer.start("axes", function(test) {
	  axesbox.render();
          axesbox.setClearColor(bgcolor);
        });
      } 

      axesbox.model.add(axes_all);
      axesbox.model.rotation.x = viewer.model.rotation.x;
      axesbox.model.rotation.y = viewer.model.rotation.y;
      axesbox.model.rotation.z = viewer.model.rotation.z;
      axesbox.model.name = "axes_on";

      if (legend_div === ""){

        legend_div = $("<p class=\"alignleft\">dorsal</p><p class=\"alignright\"><canvas id=\"dorsal\"></canvas></p><div style=\"clear: both;\">" +
          "<p class=\"alignleft\">ventral</p><p class=\"alignright\"><canvas id=\"ventral\"></canvas></p><div style=\"clear: both;\">" +
          "<p class=\"alignleft\">anterior</p><p class=\"alignright\"><canvas id=\"anterior\"></canvas></p><div style=\"clear: both;\">" +
          "<p class=\"alignleft\">posterior</p><p class=\"alignright\"><canvas id=\"posterior\"></canvas></p><div style=\"clear: both;\">" +
          "<p class=\"alignleft\">lateral</p><p class=\"alignright\"><canvas id=\"lateral\"></canvas></p><div style=\"clear: both;\">" +
          "<p class=\"alignleft\">medial</p><p class=\"alignright\"><canvas id=\"medial\"></canvas></p><div style=\"clear: both;\">");
          legend_div.appendTo("#axes_legend");

        drawDashed("dorsal","#0000ff",150);	//blue solid
        drawDashed("ventral","#0000ff",8); 	//blue dashed
        drawDashed("anterior","#00ff00",150);	//green solid
        drawDashed("posterior","#00ff00",8);	//green dashed
        drawDashed("lateral","#ff0000",150);	//red solid
        drawDashed("medial","#ff0000",8);	//red dashed
        document.getElementById("axes_legend").style.backgroundColor = "black";
      } else {
        document.getElementById("axes_legend").style.visibility = "visible";
        document.getElementById("axes").style.visibility = "visible";
      }
    }

    function buildAxis( src, dst, colorHex, dashed ) {
      var geom = new THREE.Geometry(),
        mat;

      if(dashed) {
        mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
      } else {
        mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
      }

      geom.vertices.push( src.clone() );
      geom.vertices.push( dst.clone() );
      geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

      var axis = new THREE.Line( geom, mat, THREE.LinePieces );

      return axis;
    }

    function drawDashed(name,color,width) {

      var canvas = document.getElementById(name);
      var context = canvas.getContext("2d");

      context.beginPath();
      context.moveTo(40, 70);
      context.lineTo(190, 70);
      context.lineWidth = 30;
      context.setLineDash([width]);

      // set line color
      context.strokeStyle = color;
      context.stroke();
    }
  });
});
