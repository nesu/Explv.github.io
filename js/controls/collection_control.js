'use strict';

import {Position} from '../model/Position.js';
import {Area} from '../model/Area.js';
import {Path} from '../model/Path.js';
import {Areas} from '../model/Areas.js';
import {PolyArea} from '../model/PolyArea.js';


// Import converters
import {OSBotAreasConverter} from '../bot_api_converters/osbot/osbot_areas_converter.js';
import {OSBotPathConverter} from '../bot_api_converters/osbot/osbot_path_converter.js';
import {OSBotPolyAreaConverter} from '../bot_api_converters/osbot/osbot_polyarea_converter.js';

import {TRiBotAreasConverter} from '../bot_api_converters/tribot/tribot_areas_converter.js';
import {TRiBotPathConverter} from '../bot_api_converters/tribot/tribot_path_converter.js';
import {TRiBotPolyAreaConverter} from '../bot_api_converters/tribot/tribot_polyarea_converter.js';

import {DreamBotAreasConverter} from '../bot_api_converters/dreambot/dreambot_areas_converter.js';
import {DreamBotPathConverter} from '../bot_api_converters/dreambot/dreambot_path_converter.js';
import {DreamBotPolyAreaConverter} from '../bot_api_converters/dreambot/dreambot_polyarea_converter.js';

import {RSPeerAreasConverter} from '../bot_api_converters/rspeer/rspeer_areas_converter.js';
import {RSPeerPathConverter} from '../bot_api_converters/rspeer/rspeer_path_converter.js';
import {RSPeerPolyAreaConverter} from '../bot_api_converters/rspeer/rspeer_polyarea_converter.js';

import {QuantumBotAreasConverter} from '../bot_api_converters/quantumbot/quantumbot_areas_converter.js';
import {QuantumBotPathConverter} from '../bot_api_converters/quantumbot/quantumbot_path_converter.js';
import {QuantumBotPolyAreaConverter} from '../bot_api_converters/quantumbot/quantumbot_polyarea_converter.js';

import {RuneMateAreasConverter} from '../bot_api_converters/runemate/runemate_areas_converter.js';
import {RuneMatePathConverter} from '../bot_api_converters/runemate/runemate_path_converter.js';
import {RuneMatePolyAreaConverter} from '../bot_api_converters/runemate/runemate_polyarea_converter.js';

var converters = {
    "OSBot": {
        "areas_converter": new OSBotAreasConverter(),
        "path_converter": new OSBotPathConverter(),
        "polyarea_converter": new OSBotPolyAreaConverter()
    },
    "TRiBot": {
        "areas_converter": new TRiBotAreasConverter(),
        "path_converter": new TRiBotPathConverter(),
        "polyarea_converter": new TRiBotPolyAreaConverter()
    },
    "DreamBot": {
        "areas_converter": new DreamBotAreasConverter(),
        "path_converter": new DreamBotPathConverter(),
        "polyarea_converter": new DreamBotPolyAreaConverter()
    },
    "RSPeer": {
        "areas_converter": new RSPeerAreasConverter(),
        "path_converter": new RSPeerPathConverter(),
        "polyarea_converter": new RSPeerPolyAreaConverter()
    },
    "QuantumBot": {
        "areas_converter": new QuantumBotAreasConverter(),
        "path_converter": new QuantumBotPathConverter(),
        "polyarea_converter": new QuantumBotPolyAreaConverter()
    },
    "RuneMate": {
        "areas_converter": new RuneMateAreasConverter(),
        "path_converter": new RuneMatePathConverter(),
        "polyarea_converter": new RuneMatePolyAreaConverter()
    }
};

export var CollectionControl = L.Control.extend({    
    options: {
        position: 'topleft'
    },

    onAdd: function (map) {
        this._path = new Path(this._map);
        this._areas = new Areas(this._map);
        this._polyArea = new PolyArea(this._map);

        this._currentDrawable = undefined;
        this._currentConverter = undefined;

        this._prevMouseRect = undefined;
        this._prevMousePos = undefined;

        this._firstSelectedAreaPosition = undefined;
        this._drawnMouseArea = undefined;    
        this._editing = false;

        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.background = 'none';
        container.style.width = '70px';
        container.style.height = 'auto';

        // Area control
        this._createControl('Area', container, function(e) {
            this._toggleCollectionMode(this._areas, "areas_converter");
        });        

        // Poly Area control
        this._createControl('Poly Area', container, function(e) {
            this._toggleCollectionMode(this._polyArea, "polyarea_converter");
        });

        // Path control
        this._createControl('Path', container, function(e) {
            this._toggleCollectionMode(this._path, "path_converter");
        });

        // Undo control
        this._createControl('<i class="fa fa-undo" aria-hidden="true"></i>', container, function(e) {
            if (this._currentDrawable !== undefined) {
                this._currentDrawable.removeLast();
                this._outputCode();
            }
        });

        // Clear control
        this._createControl('<i class="fa fa-trash" aria-hidden="true"></i>', container, function(e) {
            if (this._currentDrawable !== undefined) {
                this._currentDrawable.removeAll();
                this._outputCode();
            }
        });

        L.DomEvent.disableClickPropagation(container);

        L.DomEvent.on(this._map, 'click', this._addPosition, this);

        L.DomEvent.on(this._map, 'mousemove', this._drawMouseArea, this);

        var context = this;
        $("#output-type").on('change', () => context._outputCode());
        $("#code-output").on('input propertychange paste', () => context._loadFromText());
        $("#bot-api").on('change', () => context._outputCode());

        return container;
    },
    
    _createControl: function(html, container, onClick) {
        var control = L.DomUtil.create('a', 'leaflet-bar leaflet-control leaflet-control-custom', container);
        control.innerHTML = html;
        L.DomEvent.on(control, 'click', onClick, this);
    },

    _addPosition: function(e) {
        if (!this._editing) {
            return;
        }

        var position = Position.fromLatLng(this._map, e.latlng, this._map.plane);

        if (this._currentDrawable instanceof Areas) {
            if (this._firstSelectedAreaPosition === undefined) {
                this._firstSelectedAreaPosition = position;
            } else {
                this._map.removeLayer(this._drawnMouseArea);
                this._areas.add(new Area(this._firstSelectedAreaPosition, position));
                this._firstSelectedAreaPosition = undefined;
                this._outputCode();
            }
        } else {
            this._currentDrawable.add(position);
            this._outputCode();
        }
    },

    _drawMouseArea: function(e) {
        if (!this._editing) {
            return;
        }

        var mousePos = Position.fromLatLng(this._map, e.latlng, this._map.plane);

        if (this._currentDrawable instanceof Areas) {
            if (this._firstSelectedAreaPosition !== undefined) {

                if (this._drawnMouseArea !== undefined) { 
                    this._map.removeLayer(this._drawnMouseArea);
                }

                this._drawnMouseArea = new Area(this._firstSelectedAreaPosition, mousePos).toLeaflet(this._map);
                this._drawnMouseArea.addTo(this._map, true);
            }
        } else if (this._currentDrawable instanceof PolyArea) {
            if (this._drawnMouseArea !== undefined) { 
                this._map.removeLayer(this._drawnMouseArea);
            }
            
            this._drawnMouseArea = new PolyArea(this._map);
            this._drawnMouseArea.addAll(this._currentDrawable.positions);
            this._drawnMouseArea.add(mousePos);
            this._drawnMouseArea = this._drawnMouseArea.toLeaflet(this._map);
            this._drawnMouseArea.addTo(this._map, true);
        }
    },

    _toggleCollectionMode: function(drawable, converter) {
        if (this._currentDrawable === drawable) {
            this._editing = false;

            this._toggleOutputContainer();

            this._firstSelectedAreaPosition = undefined;
            this._map.removeLayer(this._currentDrawable.featureGroup);

            if (this._drawnMouseArea !== undefined) {
                this._map.removeLayer(this._drawnMouseArea);
            }
            
            this._currentDrawable = undefined;
            this._currentConverter = undefined;
            
            this._outputCode();
            return;
        }

        this._editing = true;
        
        this._currentConverter = converter;

        if ($("#output-container").css('display') == 'none') {
            this._toggleOutputContainer();
        }

        if (this._currentDrawable !== undefined) {
            this._map.removeLayer(this._currentDrawable.featureGroup);
        }

        this._firstSelectedAreaPosition = undefined;

        if (this._drawnMouseArea !== undefined) {
            this._map.removeLayer(this._drawnMouseArea);
        }

        this._currentDrawable = drawable;

        if (this._currentDrawable !== undefined) {
            this._map.addLayer(this._currentDrawable.featureGroup);
        }

        this._outputCode();
    },

    _toggleOutputContainer: function() {
        if ($("#output-container").css('display') == 'none') {
            $("#map-container").removeClass("col-lg-12 col-md-12 col-sm-12 col-xs-12");
            $("#map-container").addClass("col-lg-9 col-md-7 col-sm-8 col-xs-8");
            $("#output-container").show();
        } else {
            $("#output-container").hide();
            $("#map-container").removeClass("col-lg-9 col-md-7 col-sm-8 col-xs-8");
            $("#map-container").addClass("col-lg-12 col-md-12 col-sm-12 col-xs-12");
        }
        this._map.invalidateSize();
    },

    _outputCode: function() {        
        var output = "";

        if (this._currentDrawable !== undefined) {
            var botAPI = $("#bot-api option:selected").text();
            output = converters[botAPI][this._currentConverter].toJava(this._currentDrawable);
        }

        $("#code-output").html(output);
    },
    
    _loadFromText: function() {
        if (this._currentDrawable !== undefined) {
            var botAPI = $("#bot-api option:selected").text();
            converters[botAPI][this._currentConverter].fromJava($("#code-output").text(), this._currentDrawable);
        }
    }
});